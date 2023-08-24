import {json} from '@shopify/remix-oxygen';

const badRequest = (data) => json(data, {status: 400});

export let loader = ({ request }) => {
//  console.log('auth0.fail loader');
//  console.log('request', request);

  return badRequest("Auth0 returns failedRedirect");
};