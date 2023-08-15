import {json, redirect} from '@shopify/remix-oxygen';

// for Auth0
import {auth0UserProfile} from './($locale).account.login';

// for Multipass
// TODO: probably need to build my own multipass library...

export let loader = ({ request, context }) => {
  console.log('multipass loader');
  console.log('multipass secret', context.env.MULTIPASS_SECRET);
  console.log('email', auth0UserProfile.profile.emails[0].value);
  
  return redirect('/');
}
