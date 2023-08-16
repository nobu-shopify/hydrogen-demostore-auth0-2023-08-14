import {json, redirect} from '@shopify/remix-oxygen';

// for Auth0
import {auth0UserProfile} from './($locale).account.login';

// for Multipass
import {Multipass} from '~/lib/multipass';

export let loader = ({ request, context }) => {
  console.log('multipass loader');
  console.log('multipass secret', context.env.MULTIPASS_SECRET);
//  console.log('email', auth0UserProfile.profile.emails[0].value);

  // Initialize
  const multipass = new Multipass(context.env.MULTIPASS_SECRET);

  // Encode
  const customerData = {
//    email: auth0UserProfile.profile.emails[0].value,
    "email": "nobu.hayashi+auth0@shopify.com",
  };

  const token = multipass.get(customerData);

  return redirect('/');
}

