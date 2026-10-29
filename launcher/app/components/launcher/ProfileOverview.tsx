import {useState} from 'react';
import {OVERVIEW_SECTIONS, type ProfilePrivacy} from '../../models/profile-settings';
import {useLocale} from '../../i18n';
import {directoryCategories, directoryCategoryKey, type DirectoryFilter} from './directory-categories';
import {PlaytimeShowcase, type PlaytimeSlice} from './PlaytimeShowcase';
import {ClearShowcase, type ClearGame} from './ClearShowcase';

/** The overview: play time and clears under one title, both narrowed by the
 * directory category chosen beside it. Either list is null while saves are
 * read. A section the owner hid from others is left out for them; the owner
 * still sees it, marked as visible only to them. */
export function ProfileOverview({playtime, clears, privacy, owner, assetUrl}: {
  playtime: readonly PlaytimeSlice[] | null; clears: readonly ClearGame[] | null; privacy: ProfilePrivacy; owner: boolean; assetUrl?(path: string): string;
}) {
  const {t} = useLocale(), [filter, setFilter] = useState<DirectoryFilter>('all');
  const shown = (section: keyof ProfilePrivacy) => owner || privacy[section];
  const badge = (section: keyof ProfilePrivacy) => privacy[section] ? null : <span className="profile-private-badge">{t('profile.privacyPrivate')}</span>;
  if (!OVERVIEW_SECTIONS.some(shown)) return null;
  return <section className="profile-overview" aria-labelledby="profileOverviewTitle">
    <header className="profile-overview-header">
      <h2 id="profileOverviewTitle">{t('profile.overview')}</h2>
      <div className="profile-overview-filter" role="group" aria-label={t('profile.playtimeCategory')}>
        {(['all', ...directoryCategories] as DirectoryFilter[]).map(value => <button key={value} type="button" aria-pressed={filter === value}
          className={filter === value ? 'selected' : undefined} onClick={() => setFilter(value)}>
          {t(value === 'all' ? 'directory.category.allNarrow' : directoryCategoryKey(value))}</button>)}
      </div>
    </header>
    {shown('playtime') && <PlaytimeShowcase slices={playtime} filter={filter} badge={badge('playtime')}/>}
    {shown('clears') && <ClearShowcase games={clears} filter={filter} badge={badge('clears')} assetUrl={assetUrl}/>}
  </section>;
}
