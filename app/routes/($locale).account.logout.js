import {redirect} from '@shopify/remix-oxygen';

// for Auth0
import { destroySession, getSession } from "~/lib/session.server";
import { clearAuth0UserProfile, authenticator } from './($locale).account.login';

export async function doLogout(context) {
  const {session} = context;
  session.unset('customerAccessToken');

  // The only file where I have to explicitly type cast i18n to pass typecheck
  return redirect(`${context.storefront.i18n.pathPrefix}/account/login`, {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}

export async function loader({context}) {
  return redirect(context.storefront.i18n.pathPrefix);
}

export const action = async ({context, request}) => {
  // Clear customerAccessToken 
  context.session.unset('customerAccessToken');

  // Clear Auth0 user profile
  clearAuth0UserProfile();

  // Redirect to Auth0 logout
  const session = await getSession(request.headers.get("Cookie"));
  const logoutURL = new URL(`https://${context.env.AUTH0_DOMAIN}/v2/logout`); // i.e https://YOUR_TENANT.us.auth0.com/v2/logout
  const callbackUrl = new URL("/", request.url).toString();
  logoutURL.searchParams.set("client_id", context.env.AUTH0_CLIENTID);
  logoutURL.searchParams.set("returnTo", callbackUrl);

  return redirect(logoutURL.toString(), {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
};
