import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DeviceService } from './core/device/device.service';
import { DocService } from './core/doc/doc.service';
import { Cmd } from './core/hid';
import { Router } from "@angular/router";
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

interface Menu {
  link: string;
  icon: string;
  name: string;
  key: Cmd;
}

const KEYBOARD_PAGE = '/key';
const SIMPLE_KEY_PAGE = '/simplekey'

const SMALL_SCREEN = "(max-width: 700px)";

const MENUS: Menu[] = [
  {
    link: KEYBOARD_PAGE,
    icon: 'keyboard_alt',
    name: '按键',
    key: Cmd.Key,
  },
  {
    link: SIMPLE_KEY_PAGE,
    icon: 'keyboard_alt',
    name: '按键',
    key: Cmd.SimpleKey,
  },
  {
    link: '/pwd',
    icon: 'lock',
    name: '密码',
    key: Cmd.Password,
  },
  {
    link: '/text',
    icon: 'speaker_notes',
    name: '字符串',
    key: Cmd.Text,
  },
  {
    link: '/light',
    icon: 'light',
    name: '灯光',
    key: Cmd.Light,
  },
];

interface Lang {
  key: string;
  title: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  matchSmallScreen = false;

  menus: Menu[] = [];
  langs: Lang[] = [];
  lang: Lang = { key: 'en', title: 'English' };

  destory$ = new Subject<void>();

  constructor(private http: HttpClient,
    private _device: DeviceService,
    private _tr: TranslateService,
    private _doc: DocService,
    private _router: Router,
    private _bpo: BreakpointObserver) {

    this._bpo.observe([SMALL_SCREEN]).pipe(takeUntil(this.destory$)).subscribe(result => {
      this.matchSmallScreen = result.breakpoints[SMALL_SCREEN];
    })


    if (navigator.hid) {
      this._device.device$.pipe(takeUntil(this.destory$)).subscribe((device: HIDDevice) => {
        if (device.opened) {
          this.menus = MENUS.filter((menu) => this._device.isSupport(menu.key));
          if (this._device.isSupport(Cmd.Key)) {
            this._router.navigate([KEYBOARD_PAGE]);
          } else {
            this._router.navigate([SIMPLE_KEY_PAGE]);
          }
        }
      });

      this.http.get<{ languages: Lang[] }>('/assets/i18n/lang.json').subscribe((res) => {
        this.langs = res.languages;

        this.setLanguage(this._tr.getBrowserLang() || 'en');
      });
    } else {
      const url = "https://caniuse.com/?search=webhid";
      const tip = `${this._tr.instant("请使用支持 Web HID 的浏览器，支持列表可查询")}:${url}`;
      alert(tip);
    }
  }

  ngOnDestroy(): void {
    this.destory$.next();
    this.destory$.complete();
  }

  setLanguage(key: string) {
    this._tr.use(key).subscribe(() => {
      const lang = this.langs.find((item) => item.key === this._tr.currentLang);

      if (lang) {
        this.lang = lang;

        this._doc.loadParamDoc();

        if (this._device.isConnected()) {
          this._doc.load(this._device.filename());
        };
      }
    });
  }

  save() {
    this._device.save();
  }

  canSave() {
    return this._device.isConnected() && this._device.isChanged();
  }
}
