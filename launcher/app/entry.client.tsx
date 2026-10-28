import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {HydratedRouter} from 'react-router/dom';
import {installNativeAppNavigation} from '../src/launcher/native-app.mts';
installNativeAppNavigation();
startTransition(() => {hydrateRoot(document, <StrictMode><HydratedRouter/></StrictMode>);});
