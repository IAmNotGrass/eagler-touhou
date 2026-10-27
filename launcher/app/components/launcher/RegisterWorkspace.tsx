import {useState, type FormEvent} from 'react';
import {useLocale} from '../../i18n';
import {isUiMessageKey} from '../../../src/launcher/i18n.mts';
import {useSurfaceNavigation} from '../../navigation/surface-navigation';

/** The same rules the account service applies. */
const USERNAME = /^[A-Za-z0-9_]{3,20}$/, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Letters, digits and printable ASCII symbols, 8–128 long, with a letter and a digit. */
function passwordProblem(password: string) {
  if (password.length < 8) return 'password-short';
  if (password.length > 128) return 'password-long';
  if (!/^[\x21-\x7e]+$/.test(password)) return 'password-chars';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'password-mix';
  return '';
}

/** The registration page: one column of fields. Mail is not set up yet, so the
 * verification code is not checked and the account is created directly; the
 * sign-in page then takes its place with the new username filled in. */
export function RegisterWorkspace({endpoint}: {endpoint: string}) {
  const {t} = useLocale(), navigation = useSurfaceNavigation();
  const [problem, setProblem] = useState(''), [busy, setBusy] = useState(false);
  // The password's problem, shown once the field has been left with an invalid password.
  const [passwordIssue, setPasswordIssue] = useState('');
  const message = (code: string) => {const key = `register.error.${code}`; return isUiMessageKey(key) ? t(key) : t('register.error.server-error');};
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), value = (name: string) => String(form.get(name) ?? '');
    const username = value('username').trim(), password = value('password'), email = value('email').trim();
    const passwordCheck = passwordProblem(password);
    setPasswordIssue(passwordCheck);
    const local = !USERNAME.test(username) ? 'username-invalid' : passwordCheck ? 'password-invalid'
      : password !== value('confirm') ? 'password-mismatch' : !EMAIL.test(email) ? 'email-invalid' : '';
    if (local) {setProblem(local === 'password-invalid' ? '' : message(local)); return;}
    setBusy(true); setProblem('');
    try {
      const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password, email, code: value('code')})});
      const body = await response.json().catch(() => ({}));
      if (response.status === 201) navigation.openLoginAfterRegister(String(body.username ?? username));
      else setProblem(message(String(body.error ?? 'server-error')));
    } catch {setProblem(message('network'));}
    finally {setBusy(false);}
  };
  return <section className="workspace-panel login-workspace register-workspace" id="registerPage" aria-labelledby="registerTitle">
    <form className="login-column" onSubmit={event => void submit(event)} noValidate>
      <h1 id="registerTitle">{t('register.title')}</h1>
      <label className="login-field"><span>{t('register.username')}</span>
        <input id="registerUsername" name="username" type="text" autoComplete="username" maxLength={20} required aria-describedby="registerUsernameHint"/>
        <small id="registerUsernameHint">{t('register.usernameHint')}</small></label>
      <label className="login-field"><span>{t('login.password')}</span>
        <input name="password" type="password" autoComplete="new-password" maxLength={128} required aria-invalid={passwordIssue ? true : undefined} aria-describedby={passwordIssue ? 'registerPasswordIssue' : undefined}
          onBlur={event => setPasswordIssue(event.currentTarget.value ? passwordProblem(event.currentTarget.value) : '')}
          onChange={event => {if (passwordIssue) setPasswordIssue(passwordProblem(event.currentTarget.value));}}/>
        {passwordIssue && <small className="login-field-error" id="registerPasswordIssue" role="alert">{message(passwordIssue)}</small>}</label>
      <label className="login-field login-field-follow"><span>{t('register.confirm')}</span>
        <input name="confirm" type="password" autoComplete="new-password" maxLength={128} required/></label>
      <label className="login-field"><span>{t('register.email')}</span>
        <input name="email" type="email" autoComplete="email" maxLength={254} required/></label>
      <div className="login-field login-field-follow"><label htmlFor="registerCode"><span>{t('register.code')}</span></label>
        <div className="register-code">
          <input id="registerCode" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} aria-describedby="registerCodeHint"/>
          <button type="button" disabled>{t('register.sendCode')}</button>
        </div>
        <small id="registerCodeHint">{t('register.codeHint')}</small></div>
      <button type="submit" className="login-submit" disabled={busy}>{t(busy ? 'register.submitting' : 'register.submit')}</button>
      <p className="login-notice" role="alert">{problem}</p>
      <div className="login-links"><button type="button" onClick={navigation.openLogin}>{t('register.haveAccount')}</button></div>
    </form>
  </section>;
}
