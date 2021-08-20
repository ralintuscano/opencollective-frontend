import React from 'react';
import { useMutation } from '@apollo/client';
import { startCase, uniq } from 'lodash';
import { useIntl } from 'react-intl';

import { i18nGraphqlException } from '../../lib/errors';
import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';

import CollectivePickerAsync from '../CollectivePickerAsync';
import { Box, Flex } from '../Grid';
import StyledButton from '../StyledButton';
import StyledCheckbox from '../StyledCheckbox';
import StyledInputField from '../StyledInputField';
import { P } from '../Text';
import { TOAST_TYPE, useToasts } from '../ToastProvider';

const CACHE_TYPES = ['CONTRIBUTORS', 'GRAPHQL_QUERIES', 'CLOUDFLARE'];

const clearCacheMutation = gqlV2/* GraphQL */ `
  mutation ClearCache($account: AccountReferenceInput!) {
    clearCacheForAccount(account: $account) {
      id
      slug
      name
    }
  }
`;

const ClearCacheForAccountForm = () => {
  const [account, setAccount] = React.useState(null);
  const [cacheTypes, setCacheTypes] = React.useState(() => [...CACHE_TYPES]);
  const [clearCache, { loading }] = useMutation(clearCacheMutation, { context: API_V2_CONTEXT });
  const { addToast } = useToasts();
  const isValid = account && cacheTypes.length > 0;
  const intl = useIntl();
  return (
    <div>
      <StyledInputField htmlFor="clear-cache-account" label="Account" flex="1 1">
        {({ id }) => <CollectivePickerAsync inputId={id} onChange={({ value }) => setAccount(value)} />}
      </StyledInputField>

      <P fontWeight="normal" fontSize="14px" color="black.800" mt={3} mb={2}>
        Cache types
      </P>

      <Flex flexWrap="wrap" px={1}>
        <StyledCheckbox
          label="All"
          checked={cacheTypes.length === CACHE_TYPES.length}
          onChange={({ checked }) => {
            if (checked) {
              setCacheTypes(CACHE_TYPES);
            } else {
              setCacheTypes([]);
            }
          }}
        />
        {CACHE_TYPES.map(cacheType => (
          <Box ml={2} key={cacheType}>
            <StyledCheckbox
              label={startCase(cacheType.toLowerCase())}
              checked={cacheTypes.includes(cacheType)}
              onChange={({ checked }) => {
                if (checked) {
                  setCacheTypes(uniq([...cacheTypes, cacheType]));
                } else {
                  setCacheTypes(cacheTypes.filter(t => t !== cacheType));
                }
              }}
            />
          </Box>
        ))}
      </Flex>

      <StyledButton
        mt={4}
        width="100%"
        buttonStyle="primary"
        disabled={!isValid}
        loading={loading}
        onClick={async () => {
          try {
            const result = await clearCache({ variables: { account: { legacyId: account.id } } });
            const resultAccount = result.data.clearCacheForAccount;
            addToast({
              type: TOAST_TYPE.SUCCESS,
              message: `Cache cleared for ${resultAccount.name} (@${resultAccount.slug})`,
            });
          } catch (e) {
            addToast({
              type: TOAST_TYPE.ERROR,
              message: i18nGraphqlException(intl, e),
            });
          }
        }}
      >
        Clear cache{account ? ` for ${account.name}` : ''}
      </StyledButton>
    </div>
  );
};

ClearCacheForAccountForm.propTypes = {};

export default ClearCacheForAccountForm;
