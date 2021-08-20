import React from 'react';
import PropTypes from 'prop-types';
import Router from 'next/router';

import { Box } from '../components/Grid';
import Page from '../components/Page';
import { withUser } from '../components/UserProvider';

class RecurringContributionsRedirectPage extends React.Component {
  static propTypes = {
    LoggedInUser: PropTypes.object,
    loadingLoggedInUser: PropTypes.bool,
  };

  async componentDidMount() {
    this.checkLoggedInUser();
  }

  async componentDidUpdate() {
    this.checkLoggedInUser();
  }

  checkLoggedInUser() {
    const { LoggedInUser, loadingLoggedInUser } = this.props;

    if (!loadingLoggedInUser) {
      if (!LoggedInUser) {
        Router.push('/signin?next=/recurring-contributions');
      } else {
        setTimeout(() => Router.push(`/${LoggedInUser.collective.slug}/recurring-contributions`), 100);
      }
    }
  }

  render() {
    return (
      <Page title="Subscriptions" description="All the collectives that you are giving money to">
        <Box py={[5, 6, 7]} textAlign="center">
          <strong>Redirecting...</strong>
        </Box>
      </Page>
    );
  }
}

export default withUser(RecurringContributionsRedirectPage);
