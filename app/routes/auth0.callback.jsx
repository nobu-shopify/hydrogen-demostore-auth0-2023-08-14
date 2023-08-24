import { authenticator } from "./($locale).account.login";

export let loader = ({ request }) => {
  console.log('auth0.callback loader');

  return authenticator.authenticate("auth0", request, {
    successRedirect: "/multipass/",
    failureRedirect: "/auth0/fail/",
  });
};