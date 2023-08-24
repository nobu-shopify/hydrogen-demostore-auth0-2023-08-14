import {json, redirect} from '@shopify/remix-oxygen';

// for Auth0
import {auth0UserProfile} from './($locale).account.login';

// for Multipass
import {Multipass} from '~/lib/multipass';

const badRequest = (data) => json(data, {status: 400});

export async function loader ({ context }) {
  console.log('multipass loader');
  console.log('multipass secret', context.env.MULTIPASS_SECRET);

  if(auth0UserProfile) {
    // Initialize
    const multipass = new Multipass(context.env.MULTIPASS_SECRET);

    // Get Multipass token
    console.log('email', auth0UserProfile.profile.emails[0].value);
    const customerData = {
      email: auth0UserProfile.profile.emails[0].value,
//      "email": "nobu.hayashi+auth0@shopify.com",
    };
    const token = multipass.generateToken(customerData);

    // Get customer token
    const {session, storefront, cart} = context;
    console.log('session', session);
//    console.log('storefront', storefront);
//    console.log('cart', cart);

    try {
      const customerAccessToken = await doLoginWithMultipass({storefront}, {token});
      console.log('customerAccessToken', customerAccessToken);
      session.set('customerAccessToken', customerAccessToken);
      console.log('token in session', session.has('customerAccessToken'), session.get('customerAccessToken'));
      
      // Sync customerAccessToken with existing cart
      const result = await cart.updateBuyerIdentity({customerAccessToken});
      console.log('cart updateBuyerIdentity', result);

      // Update cart id in cookie
      const headers = cart.setCartId(result.cart.id);
      console.log('__headers', headers);
      headers.append('Set-Cookie', await session.commit());
      console.log('headers', headers);
      return redirect('/', {headers});
  
//      return redirect(params.locale ? `/${params.locale}/account` : '/account', {
//        headers,
//      });

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
          'Sorry. We did not get Multipass token. Please try to sign out, and sign in again.',
        error: JSON.stringify(error),
      });
    }
  }

  // Customer info not available - do nothing
  console.log('customer info NOT available - do nothing');
  return redirect('/');
}

const LOGINWITHMULTIPASS_MUTATION = `#graphql
  mutation customerAccessTokenCreateWithMultipass($multipassToken: String!) {
    customerAccessTokenCreateWithMultipass(multipassToken: $multipassToken) {
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

export async function doLoginWithMultipass({storefront}, {token}) {
  const data = await storefront.mutate(LOGINWITHMULTIPASS_MUTATION, {
    variables: { multipassToken: token,},
    cache: storefront.CacheNone(),
  });

  if (data?.customerAccessTokenCreateWithMultipass?.customerAccessToken?.accessToken) {
    return data.customerAccessTokenCreateWithMultipass.customerAccessToken.accessToken;
  }

  /**
   * Something is wrong with the user's input.
   */
  throw new Error(
    data?.customerAccessTokenCreateWithMultipass?.customerUserErrors.join(', '),
  );
}

