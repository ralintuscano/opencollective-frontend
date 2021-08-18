import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@apollo/client';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import styled from 'styled-components';

import { CollectiveType } from '../../../lib/constants/collectives';
import CollectiveRoles from '../../../lib/constants/roles';
import { API_V2_CONTEXT, gqlV2 } from '../../../lib/graphql/helpers';

import Container from '../../Container';
import { Box, Flex, Grid } from '../../Grid';
import LoadingPlaceholder from '../../LoadingPlaceholder';
import StyledButton from '../../StyledButton';
import StyledFilters from '../../StyledFilters';
import { fadeIn } from '../../StyledKeyframes';
import StyledMembershipCard from '../../StyledMembershipCard';
import { H3 } from '../../Text';
import { Dimensions } from '../_constants';
import ContainerSectionContent from '../ContainerSectionContent';
import SectionTitle from '../SectionTitle';

const PAGE_SIZE = 15;

const FILTERS = {
  ALL: 'ALL',
  HOSTED_COLLECTIVES: 'HOST',
  HOSTED_FUNDS: 'FUNDS',
  HOSTED_EVENTS: 'EVENT',
  CORE: 'CORE',
  FINANCIAL: 'FINANCIAL',
  EVENTS: 'EVENTS',
};

const FILTER_PROPS = [
  {
    id: FILTERS.ALL,
    where: {
      role: [
        CollectiveRoles.HOST,
        CollectiveRoles.ADMIN,
        CollectiveRoles.CONTRIBUTOR,
        CollectiveRoles.BACKER,
        CollectiveRoles.MEMBER,
        CollectiveRoles.FUNDRAISER,
      ],
      accountType: null,
    },
    isActive: () => true,
  },
  {
    id: FILTERS.HOSTED_COLLECTIVES,
    where: {
      role: [CollectiveRoles.HOST],
      accountType: [CollectiveType.COLLECTIVE],
    },
    isActive: roles => roles?.some(r => r.role === CollectiveRoles.HOST && r.type === CollectiveType.COLLECTIVE),
  },
  {
    id: FILTERS.HOSTED_FUNDS,
    where: {
      role: [CollectiveRoles.HOST],
      accountType: [CollectiveType.FUND],
    },
    isActive: roles => roles?.some(r => r.role === CollectiveRoles.HOST && r.type === CollectiveType.FUND),
  },
  {
    id: FILTERS.HOSTED_EVENTS,
    where: { role: [CollectiveRoles.HOST], accountType: [CollectiveType.EVENT] },
    isActive: roles => roles?.some(r => r.role === CollectiveRoles.HOST && r.type === 'EVENT'),
  },
  {
    id: FILTERS.FINANCIAL,
    where: { role: [CollectiveRoles.BACKER], accountType: null },
    isActive: roles => roles?.some(r => r.role === CollectiveRoles.BACKER),
  },
  {
    id: FILTERS.CORE,
    where: { role: [CollectiveRoles.ADMIN, CollectiveRoles.MEMBER], accountType: null },
    isActive: roles => roles?.some(r => r.role === CollectiveRoles.ADMIN || r.role === CollectiveRoles.MEMBER),
  },
  {
    id: FILTERS.EVENTS,
    where: { role: [CollectiveRoles.ATTENDEE], accountType: null },
    isActive: roles => roles?.some(r => r.role === CollectiveRoles.ATTENDEE),
  },
];

const getAvailableFilters = roles => {
  return FILTER_PROPS.filter(f => f.isActive(roles)).map(f => f.id);
};

const I18nFilters = defineMessages({
  [FILTERS.ALL]: {
    id: 'SectionContributions.All',
    defaultMessage: 'All Contributions',
  },
  [FILTERS.HOSTED_COLLECTIVES]: {
    id: 'HostedCollectives',
    defaultMessage: 'Hosted Collectives',
  },
  [FILTERS.HOSTED_FUNDS]: {
    id: 'HostedFunds',
    defaultMessage: 'Hosted Funds',
  },
  [FILTERS.HOSTED_EVENTS]: {
    id: 'HostedEvents',
    defaultMessage: 'Hosted Events',
  },
  [FILTERS.FINANCIAL]: {
    id: 'Member.Role.BACKER',
    defaultMessage: 'Financial Contributor',
  },
  [FILTERS.CORE]: {
    id: 'Member.Role.MEMBER',
    defaultMessage: 'Core Contributor',
  },
  [FILTERS.EVENTS]: {
    id: 'Events',
    defaultMessage: 'Events',
  },
});

const GRID_TEMPLATE_COLUMNS = 'repeat(auto-fill, minmax(220px, 1fr))';

/** A container for membership cards to ensure we have a smooth transition */
const MembershipCardContainer = styled.div`
  animation: ${fadeIn} 0.2s;
`;

const contributionsSectionQuery = gqlV2/* GraphQL */ `
  query ContributionsSection(
    $slug: String!
    $limit: Int!
    $offset: Int
    $role: [MemberRole]
    $accountType: [AccountType]
  ) {
    account(slug: $slug) {
      id
      settings
      type
      isHost # TODO: Fetch number of hosted collectives
      memberOf(
        limit: $limit
        offset: $offset
        role: $role
        accountType: $accountType
        orderByRoles: true
        isApproved: true
        isArchived: false
      ) {
        offset
        limit
        totalCount
        roles {
          role
          type
        }
        nodes {
          id
          role
          tier {
            name
            description
          }
          since
          totalDonations {
            currency
            valueInCents
          }
          publicMessage
          description
          account {
            id
            name
            slug
            type
            isIncognito
            isAdmin
            isHost
            imageUrl(height: 128)
            backgroundImageUrl(height: 200)
            ... on Event {
              parent {
                id
                backgroundImageUrl(height: 200)
              }
            }
            ... on Project {
              parent {
                id
                backgroundImageUrl(height: 200)
              }
            }
            backers: members(role: [BACKER]) {
              totalCount
            }
          }
        }
      }
      hostedAccounts: memberOf(role: [HOST], accountType: [COLLECTIVE, FUND], isApproved: true, isArchived: false) {
        totalCount
      }
      connectedAccounts: members(role: [CONNECTED_ACCOUNT]) {
        totalCount
        nodes {
          id
          role
          tier {
            name
            description
          }
          publicMessage
          description
          account {
            id
            name
            slug
            type
            isIncognito
            isAdmin
            isHost
            imageUrl
          }
        }
      }
    }
  }
`;

const SectionContributions = ({ collective }) => {
  const intl = useIntl();
  const [isLoadingMore, setLoadingMore] = React.useState(false);
  const [filter, setFilter] = React.useState(collective.isHost ? FILTERS.HOSTED_COLLECTIVES : FILTERS.ALL);
  const selectedFilter = FILTER_PROPS.find(f => f.id === filter);
  const { data, loading, fetchMore } = useQuery(contributionsSectionQuery, {
    variables: { slug: collective.slug, limit: PAGE_SIZE, offset: 0, ...selectedFilter.where },
    context: API_V2_CONTEXT,
    notifyOnNetworkStatusChange: true,
  });

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const offset = memberOf.nodes.length;
    const selectedFilter = FILTER_PROPS.find(f => f.id === filter);
    await fetchMore({
      variables: { offset, ...selectedFilter.where },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) {
          return prev;
        }
        return Object.assign({}, prev, {
          account: {
            ...prev.account,
            memberOf: {
              ...fetchMoreResult.account.memberOf,
              nodes: [...prev.account.memberOf.nodes, ...fetchMoreResult.account.memberOf.nodes],
            },
          },
        });
      },
    });
    setLoadingMore(false);
  };

  const handleFilterSelect = id => {
    setFilter(id);
    const selectedFilter = FILTER_PROPS.find(f => f.id === id);
    fetchMore({
      variables: { offset: 0, ...selectedFilter.where },
      updateQuery: (prev, { fetchMoreResult }) => {
        return fetchMoreResult ? fetchMoreResult : prev;
      },
    });
  };

  const { account, memberOf, hostedAccounts, connectedAccounts } = data?.account || {};
  const isOrganization = account?.type === CollectiveType.ORGANIZATION;
  const availableFilters = getAvailableFilters(memberOf?.roles || []);
  const membersLeft = memberOf && memberOf.totalCount - memberOf.nodes.length;
  return (
    <Box pb={4}>
      <React.Fragment>
        <ContainerSectionContent>
          {hostedAccounts?.totalCount > 0 && (
            <H3 fontSize={['20px', '24px', '32px']} fontWeight="normal" color="black.700">
              <FormattedMessage
                id="organization.collective.memberOf.collective.host.title"
                values={{ n: hostedAccounts.totalCount }}
                defaultMessage="We are fiscally hosting {n, plural, one {this Collective} other {{n} Collectives}}"
              />
            </H3>
          )}
        </ContainerSectionContent>
        {availableFilters?.length > 1 && (
          <Box mt={4} mx="auto" maxWidth={Dimensions.MAX_SECTION_WIDTH}>
            <StyledFilters
              filters={availableFilters}
              getLabel={key => intl.formatMessage(I18nFilters[key])}
              onChange={handleFilterSelect}
              selected={filter}
              justifyContent="left"
              minButtonWidth={175}
              px={Dimensions.PADDING_X}
              disabled={isLoadingMore}
            />
          </Box>
        )}
        <Container
          data-cy="Contributions"
          maxWidth={Dimensions.MAX_SECTION_WIDTH}
          px={Dimensions.PADDING_X}
          mt={4}
          mx="auto"
        >
          <Grid gridGap={24} gridTemplateColumns={GRID_TEMPLATE_COLUMNS}>
            {(!loading || (isLoadingMore && loading)) &&
              memberOf.nodes.map(membership => (
                <MembershipCardContainer data-cy="collective-contribution" key={membership.id}>
                  <StyledMembershipCard membership={membership} />
                </MembershipCardContainer>
              ))}
            {loading &&
              [...Array(membersLeft < PAGE_SIZE ? membersLeft : PAGE_SIZE).keys()].map(id => (
                <LoadingPlaceholder key={id} height={334} />
              ))}
          </Grid>
        </Container>
        {memberOf?.nodes.length < memberOf?.totalCount && (
          <Flex mt={3} justifyContent="center">
            <StyledButton
              data-cy="load-more"
              textTransform="capitalize"
              minWidth={170}
              onClick={handleLoadMore}
              loading={loading}
            >
              <FormattedMessage id="loadMore" defaultMessage="load more" /> ↓
            </StyledButton>
          </Flex>
        )}
      </React.Fragment>

      {connectedAccounts?.totalCount > 0 && (
        <Box mt={5}>
          <ContainerSectionContent>
            <SectionTitle textAlign="left" mb={4} fontSize={['20px', '24px', '32px']} color="black.700">
              {isOrganization ? (
                <FormattedMessage
                  id="CP.Contributions.PartOfOrg"
                  defaultMessage="{n, plural, one {This Collective is} other {These Collectives are}} part of our Organization"
                  values={{ n: connectedAccounts.totalCount }}
                />
              ) : (
                <FormattedMessage
                  id="CP.Contributions.ConnectedCollective"
                  defaultMessage="{n, plural, one {This Collective is} other {These Collectives are}} connected to us"
                  values={{ n: connectedAccounts.totalCount }}
                />
              )}
            </SectionTitle>
          </ContainerSectionContent>
          <Container maxWidth={Dimensions.MAX_SECTION_WIDTH} pl={Dimensions.PADDING_X} m="0 auto">
            <Grid gridGap={24} gridTemplateColumns={GRID_TEMPLATE_COLUMNS}>
              {connectedAccounts.nodes.map(membership => (
                <MembershipCardContainer key={membership.id}>
                  <StyledMembershipCard membership={membership} />
                </MembershipCardContainer>
              ))}
            </Grid>
          </Container>
        </Box>
      )}
    </Box>
  );
};

SectionContributions.propTypes = {
  collective: PropTypes.shape({
    slug: PropTypes.string,
    isHost: PropTypes.bool,
  }),
};

const ContributionsGrid = ({ entries, children }) => {
  return (
    <Container
      data-cy="Contributions"
      maxWidth={Dimensions.MAX_SECTION_WIDTH}
      px={Dimensions.PADDING_X}
      mt={4}
      mx="auto"
    >
      <Grid gridGap={24} gridTemplateColumns={GRID_TEMPLATE_COLUMNS}>
        {entries.map(entry => (
          <MembershipCardContainer key={entry.id} data-cy="collective-contribution">
            {children(entry)}
          </MembershipCardContainer>
        ))}
      </Grid>
    </Container>
  );
};

ContributionsGrid.propTypes = {
  entries: PropTypes.array.isRequired,
  children: PropTypes.func.isRequired,
};

export default SectionContributions;
