import {json, redirect} from '@shopify/remix-oxygen';
import {Form, useActionData, useLoaderData} from '@remix-run/react';
import {useState} from 'react';

import {getInputStyleClasses} from '~/lib/utils';
import {Link} from '~/components';

// for Auth0
import { sessionStorage } from '~/lib/session.server';
import { Authenticator } from "remix-auth";
import { Auth0Strategy } from "remix-auth-auth0";

export const handle = {
  isPublic: true,
};

// for Auth0
export var authenticator = null;
export var auth0UserProfile = null;

// for multipass
export var multipassToken = null;

export async function loader({context, params}) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.locale ? `${params.locale}/account` : '/account');
  }

  // TODO: Query for this?
  return (json({shopName: 'Hydrogen'}));
}

const badRequest = (data) => json(data, {status: 400});

export const action = async ({request, context, params}) => {
  // for Auth0
  if(!auth0UserProfile) {
    let auth0Strategy = new Auth0Strategy(
      {
        callbackURL: "http://localhost:3000/auth0/callback/",
        clientID: context.env.AUTH0_CLIENTID,
        clientSecret: context.env.AUTH0_CLIENTSECRET,
        domain: context.env.AUTH0_DOMAIN,
      },
      async ({ profile }) => {
        //
        // profile has the user data from Auth0
        // ref: https://github.com/danestves/remix-auth-auth0/blob/main/src/index.ts#L27
        // Get the user data from your DB or API using the profile
        //
        return copyProfile({ profile });
      }
    );
    // Create an instance of the authenticator, pass a generic with what your
    // strategies will return and will be stored in the session
    const request2 = { ...request };
    authenticator = new Authenticator(sessionStorage);
    authenticator.use(auth0Strategy);

    try {
      return authenticator.authenticate("auth0", request2);
    }
    catch (error) {
      return badRequest({
        formError:
          `Auth0 error: ${error}`,
      });
  }

  }

  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (
    !email ||
    !password ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return badRequest({
      formError: 'Please provide both an email and a password.',
    });
  }

  const {session, storefront, cart} = context;

  try {
    const customerAccessToken = await doLogin(context, {email, password});
    session.set('customerAccessToken', customerAccessToken);

    // Sync customerAccessToken with existing cart
    const result = await cart.updateBuyerIdentity({customerAccessToken});

    // Update cart id in cookie
    const headers = cart.setCartId(result.cart.id);

    headers.append('Set-Cookie', await session.commit());

    return redirect(params.locale ? `/${params.locale}/account` : '/account', {
      headers,
    });
  } catch (error) {
    if (storefront.isApiError(error)) {
      return badRequest({
        formError: 'Something went wrong. Please try again later.',
      });
    }

    /**
     * The user did something wrong, but the raw error from the API is not super friendly.
     * Let's make one up.
     */
    return badRequest({
      formError:
        'Sorry. We did not recognize either your email or password. Please try to sign in again or create a new account.',
    });
  }
};

export const meta = () => {
  return [{title: 'Login'}];
};

export default function Login() {
  const {shopName} = useLoaderData();
  const actionData = useActionData();
  const [nativeEmailError, setNativeEmailError] = useState(null);
  const [nativePasswordError, setNativePasswordError] = useState(null);

  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl">Sign in.</h1>
        {/* TODO: Add onSubmit to validate _before_ submission with native? */}
        <Form
          method="post"
          noValidate
          className="pt-6 pb-8 mt-4 mb-4 space-y-3"
        >
          {actionData?.formError && (
            <div className="flex items-center justify-center mb-6 bg-zinc-500">
              <p className="m-4 text-s text-contrast">{actionData.formError}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
              type="submit"
              disabled={!!(nativePasswordError || nativeEmailError)}
            >
              Sign in with Auth0
            </button>
          </div>
        </Form>
        <Form action="/account/logout" method="post">
          <button
            className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
          >
            Sign out with Auth0
          </button>
        </Form>
      </div>
    </div>
  );
}

const LOGIN_MUTATION = `#graphql
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
`;

export async function doLogin({storefront}, {email, password}) {
  const data = await storefront.mutate(LOGIN_MUTATION, {
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  if (data?.customerAccessTokenCreate?.customerAccessToken?.accessToken) {
    return data.customerAccessTokenCreate.customerAccessToken.accessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(
    data?.customerAccessTokenCreate?.customerUserErrors.join(', '),
  );
}

// for Auth0
export async function copyProfile( profile ) {
  // Copy profile
  auth0UserProfile = profile;

  return { profile };
}
