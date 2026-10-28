import {useState} from 'react';
import {useLocale} from '../../i18n';
import {ProfileAvatar} from '../notices/ProfileDialog';
import {COMMENT_LIMITS, type ProfileComment} from '../../models/profile-comments';

/** Comments shown before "show more". */
const PAGE = 10;
const TRASH = 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z';

/** The comment board below the overview, laid out like Steam's: the
 * writer's avatar, a box to write in and the post button on one row, then the
 * comments, newest first, each with its author and when it was left. The
 * profile's owner and a comment's author may delete it. Signed out, the box is closed and the button leads to
 * sign-in. Comments are kept in this browser for now, so the author is always
 * the owner. */
export function ProfileComments({comments, name, avatar, handle, signedIn, owner, assetUrl, onAdd, onRemove, onSignIn, now = Date.now()}: {
  comments: readonly ProfileComment[]; name: string; avatar?: string | null; handle: string | null; assetUrl(path: string): string;
  /** `handle` is the signed-in viewer's username; `owner` whether the profile is theirs. */
  signedIn: boolean; owner: boolean; onSignIn(): void;
  /** Stores a comment and returns false when it could not be kept. */
  onAdd(body: string): boolean; onRemove(id: string): void; now?: number;
}) {
  const {t, locale} = useLocale();
  const [draft, setDraft] = useState(''), [error, setError] = useState(''), [shown, setShown] = useState(PAGE);
  const post = () => {
    if (!draft.trim()) return;
    if (onAdd(draft)) {setDraft(''); setError('');} else setError(t('profile.commentFailed'));
  };
  /** "Just now", minutes or hours ago within a day, then the date. */
  const when = (at: string) => {
    const seconds = Math.max(0, (now - Date.parse(at)) / 1000);
    if (seconds < 60) return t('profile.commentJustNow');
    const relative = new Intl.RelativeTimeFormat(locale, {numeric: 'always'});
    if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute');
    if (seconds < 86400) return relative.format(-Math.floor(seconds / 3600), 'hour');
    return new Intl.DateTimeFormat(locale, {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(at));
  };
  const author = name || t('profile.unnamed');
  return <section className="profile-comments" aria-labelledby="profileCommentsTitle">
    <header className="profile-comments-header">
      <h2 id="profileCommentsTitle">{t('profile.comments')}</h2>
      {comments.length > 0 && <span className="profile-comments-count">{comments.length}</span>}
    </header>
    <div className="profile-comment-compose">
      <ProfileAvatar name={name} src={avatar} assetUrl={assetUrl}/>
      <div className="profile-comment-compose-main">
        <div className="profile-comment-compose-row">
          <label className="visually-hidden" htmlFor="profileCommentInput">{t('profile.commentAdd')}</label>
          <textarea id="profileCommentInput" rows={1} value={draft} maxLength={COMMENT_LIMITS.body} disabled={!signedIn}
            placeholder={t(signedIn ? 'profile.commentAdd' : 'profile.commentSignedOut')}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {event.preventDefault(); post();}}}/>
          {signedIn ? <button type="button" className="profile-comment-post" id="profileCommentPost" disabled={!draft.trim()} onClick={post}>{t('profile.commentPost')}</button>
            : <button type="button" className="profile-comment-post" id="profileCommentPost" onClick={onSignIn}>{t('profile.commentSignIn')}</button>}
        </div>
        {error ? <p className="profile-comment-error" role="alert">{error}</p>
          : draft.length > COMMENT_LIMITS.body * 0.8 && <small className="profile-comment-count">{draft.length} / {COMMENT_LIMITS.body}</small>}
      </div>
    </div>
    {comments.length ? <ol className="profile-comment-list">
      {comments.slice(0, shown).map(comment => <li key={comment.id} className="profile-comment">
        <ProfileAvatar name={name} src={avatar} assetUrl={assetUrl}/>
        <div className="profile-comment-main">
          <p className="profile-comment-meta">
            <b>{author}</b>{comment.author && <span className="profile-comment-handle">@{comment.author}</span>}
            <time dateTime={comment.at} title={new Date(comment.at).toLocaleString(locale)}>{when(comment.at)}</time>
          </p>
          <p className="profile-comment-body">{comment.body}</p>
        </div>
        {(owner || (handle !== null && comment.author?.toLowerCase() === handle.toLowerCase())) &&
          <button type="button" className="profile-comment-remove" aria-label={t('profile.commentRemove')} title={t('profile.commentRemove')} onClick={() => onRemove(comment.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TRASH}/></svg></button>}
      </li>)}
    </ol> : <p className="profile-comments-empty">{t('profile.commentsEmpty')}</p>}
    {comments.length > shown && <button type="button" className="profile-comments-more" onClick={() => setShown(count => count + PAGE)}>
      {t('profile.commentsMore', {count: comments.length - shown})}</button>}
  </section>;
}
