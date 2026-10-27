import {useState, type FormEvent} from 'react';
import {useLocale} from '../../i18n';
import {isUiMessageKey} from '../../../src/launcher/i18n.mts';
import {useSurfaceNavigation} from '../../navigation/surface-navigation';
import type {AccountSnapshot} from '../../services/account';

const discordMark = 'M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.37-.44.86-.6 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.07 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03M8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42m7.97 0c-1.18 0-2.15-1.09-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42';

/** The sign-in page: one card below the header, split into the username or
 * email and password form on the left and other ways to sign in on the right.
 * Signing in opens the visitor's profile. Discord and password recovery are
 * not available yet and only say so; registration has its own page. */
export function LoginWorkspace({account, onSignIn, onSignOut}: {
  account: AccountSnapshot; onSignIn(identifier: string, password: string): Promise<string | null>; onSignOut(): void;
}) {
  const {t} = useLocale(), navigation = useSurfaceNavigation();
  const registered = navigation.registeredUsername;
  const [notice, setNotice] = useState(() => registered ? t('login.registered', {username: registered}) : ''), [busy, setBusy] = useState(false);
  const unavailable = () => setNotice(t('login.unavailable'));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), identifier = String(form.get('username') ?? '').trim(), password = String(form.get('password') ?? '');
    if (!identifier || !password) {setNotice(t('login.error.missing')); return;}
    setBusy(true); setNotice('');
    const problem = await onSignIn(identifier, password);
    setBusy(false);
    if (!problem) {navigation.openProfile(); return;}
    const key = `login.error.${problem}`;
    setNotice(isUiMessageKey(key) ? t(key) : t('login.error.server-error'));
  };
  if (account.status === 'signed-in') return <section className="workspace-panel login-workspace register-workspace" id="loginPage" aria-labelledby="loginTitle">
    <div className="login-column register-done">
      <h1 id="loginTitle">{t('login.signedInTitle')}</h1>
      <p>{t('login.signedIn', {username: account.username ?? ''})}</p>
      <button type="button" className="login-submit" id="loginUsername" onClick={navigation.openProfile}>{t('login.toProfile')}</button>
      <div className="login-links"><button type="button" onClick={onSignOut}>{t('login.signOut')}</button></div>
    </div>
  </section>;
  return <section className="workspace-panel login-workspace" id="loginPage" aria-labelledby="loginTitle">
    <form className="login-column login-password" onSubmit={event => void submit(event)} noValidate>
      <h1 id="loginTitle">{t('login.title')}</h1>
      <label className="login-field"><span>{t('login.username')}</span>
        <input id="loginUsername" name="username" type="text" autoComplete="username" required defaultValue={registered ?? undefined}/></label>
      <label className="login-field"><span>{t('login.password')}</span>
        <input id="loginPassword" name="password" type="password" autoComplete="current-password" required/></label>
      <button type="submit" className="login-submit" disabled={busy}>{t(busy ? 'login.submitting' : 'login.submit')}</button>
      <div className="login-links">
        <button type="button" id="loginRegister" onClick={navigation.openRegister}>{t('login.register')}</button>
        <button type="button" id="loginRecover" onClick={() => setNotice(t('login.recoverUnavailable'))}>{t('login.recover')}</button>
      </div>
      <p className="login-notice" role="status" data-kind={registered && notice === t('login.registered', {username: registered}) ? 'success' : undefined}>{notice}</p>
    </form>
    <div className="login-divider" aria-hidden="true"><span>{t('login.or')}</span></div>
    <div className="login-column login-providers">
      <h2>{t('login.other')}</h2>
      <button type="button" className="login-provider login-discord" onClick={unavailable}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={discordMark}/></svg><span>{t('login.discord')}</span>
      </button>
    </div>
  </section>;
}
