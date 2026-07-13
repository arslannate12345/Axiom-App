import { URL, URLSearchParams } from 'react-native-url-polyfill';

globalThis.URL = URL as unknown as typeof globalThis.URL;
globalThis.URLSearchParams = URLSearchParams as unknown as typeof globalThis.URLSearchParams;

import 'expo-router/entry';
