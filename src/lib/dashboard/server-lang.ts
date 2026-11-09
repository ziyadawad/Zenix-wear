import 'server-only';
import { cookies } from 'next/headers';
import { DASH_LANG_COOKIE, toDashLang } from './lang';

export const dashLang = async () => toDashLang((await cookies()).get(DASH_LANG_COOKIE)?.value);
