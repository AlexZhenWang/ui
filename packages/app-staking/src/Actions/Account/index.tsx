// Copyright 2017-2020 @polkadot/app-staking authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { DerivedStakingOverview, DerivedHeartbeats } from '@polkadot/api-derive/types';
import { AccountId, AssetId, Balance, Exposure, StakingLedger, ValidatorPrefs } from '@polkadot/types/interfaces';
import { Codec, ITuple } from '@polkadot/types/types';

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { AddressInfo, AddressMini, AddressSmall, Button, Menu, Popup, TxButton } from '@polkadot/react-components';
import { useAccounts, useApi, useCall, useToggle } from '@polkadot/react-hooks';
import { u8aConcat, u8aToHex } from '@polkadot/util';

import { useTranslation } from '../../translate';
import BondExtra from './BondExtra';
import InjectKeys from './InjectKeys';
import Nominate from './Nominate';
import SetControllerAccount from './SetControllerAccount';
import SetRewardDestination from './SetRewardDestination';
import SetSessionKey from './SetSessionKey';
import Unbond from './Unbond';
import Validate from './Validate';
import useInactives from './useInactives';
import {DerivedSessionKeyInfo, DerivedStakingInfo} from "@cennznet/api/derives/types";

type ValidatorInfo = ITuple<[ValidatorPrefs, Codec]>;

interface Props {
  allStashes?: string[];
  className?: string;
  isOwnStash: boolean;
  next: string[];
  onUpdateType: (stashId: string, type: 'validator' | 'nominator' | 'started' | 'other') => void;
  recentlyOnline?: DerivedHeartbeats;
  stakingOverview?: DerivedStakingOverview;
  stashId: string;
}

interface StakeState {
  controllerId: string | null;
  destination: number;
  hexSessionIdNext: string | null;
  hexSessionIdQueue: string | null;
  isLoading: boolean;
  isOwnController: boolean;
  isStashNominating: boolean;
  isStashValidating: boolean;
  nominees?: string[];
  sessionKeys: string[];
  stakers?: Exposure;
  stakingLedger?: StakingLedger;
  validatorPrefs?: ValidatorPrefs;
}

interface DerivedStakingAccount extends DerivedStakingInfo, DerivedSessionKeyInfo {};

function toIdString (id?: AccountId | null): string | null {
  return id
    ? id.toString()
    : null;
}

function getStakeState (allAccounts: string[], allStashes: string[] | undefined, { controllerId: _controllerId, nextSessionKeys, nominators, rewardDestination, sessionKeys, stakers, stakingLedger, validatorPrefs }: DerivedStakingAccount, stashId: string, validateInfo: ValidatorInfo): StakeState {
  const isStashNominating = !!(nominators?.length);
  const isStashValidating = !validateInfo.isEmpty || !!allStashes?.includes(stashId);
  const nextConcat = u8aConcat(...nextSessionKeys.map((id): Uint8Array => id.toU8a()));
  const currConcat = u8aConcat(...sessionKeys.map((id): Uint8Array => id.toU8a()));
  const controllerId = toIdString(_controllerId);

  return {
    controllerId,
    destination: rewardDestination?.toNumber() || 0,
    hexSessionIdNext: u8aToHex(nextConcat, 48),
    hexSessionIdQueue: u8aToHex(currConcat.length ? currConcat : nextConcat, 48),
    isLoading: false,
    isOwnController: allAccounts.includes(controllerId || ''),
    isStashNominating,
    isStashValidating,
    // we assume that all ids are non-null
    nominees: nominators?.map(toIdString) as string[],
    sessionKeys: (
      nextSessionKeys.length
        ? nextSessionKeys
        : sessionKeys
    ).map(toIdString) as string[],
    stakers,
    stakingLedger,
    validatorPrefs
  };
}

function Account ({ allStashes, className, isOwnStash, next, onUpdateType, stakingOverview, stashId }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { api } = useApi();
  const { allAccounts } = useAccounts();
  const validateInfo = useCall<ValidatorInfo>(api.query.staking.validators, [stashId]);
  const stakingAssetId = useCall<AssetId>(api.query.genericAsset.stakingAssetId, []);
  const freeBalance = useCall<Balance>(api.query.genericAsset.freeBalance, [stakingAssetId, stashId]);
  const stakingAccountInfo = useCall<DerivedStakingInfo>((api.derive.staking as any).accountInfo, [stashId]);
  const stakingSessionInfo = useCall<DerivedSessionKeyInfo>((api.derive.session as any).keyInfo, [stashId]);
  const stakingAccount = stakingAccountInfo && stakingSessionInfo ? {...stakingAccountInfo, ...stakingSessionInfo} : undefined;
  const [{ controllerId, destination, hexSessionIdQueue, hexSessionIdNext, isLoading, isOwnController, isStashNominating, isStashValidating, nominees, sessionKeys, validatorPrefs }, setStakeState] = useState<StakeState>({ controllerId: null, destination: 0, hexSessionIdNext: null, hexSessionIdQueue: null, isLoading: true, isOwnController: false, isStashNominating: false, isStashValidating: false, sessionKeys: [] });
  const [activeNoms, setActiveNoms] = useState<string[]>([]);
  const inactiveNoms = useInactives(stashId, nominees);
  const [isBondExtraOpen, toggleBondExtra] = useToggle();
  const [isInjectOpen, toggleInject] = useToggle();
  const [isNominateOpen, toggleNominate] = useToggle();
  const [isRewardDestinationOpen, toggleRewardDestination] = useToggle();
  const [isSetControllerOpen, toggleSetController] = useToggle();
  const [isSetSessionOpen, toggleSetSession] = useToggle();
  const [isSettingsOpen, toggleSettings] = useToggle();
  const [isUnbondOpen, toggleUnbond] = useToggle();
  const [isValidateOpen, toggleValidate] = useToggle();

  useEffect((): void => {
    if (stakingAccount && validateInfo) {
      const state = getStakeState(allAccounts, allStashes, stakingAccount, stashId, validateInfo);

      setStakeState(state);

      if (state.isStashValidating) {
        onUpdateType(stashId, 'validator');
      } else if (state.isStashNominating) {
        onUpdateType(stashId, 'nominator');
      } else {
        onUpdateType(stashId, 'other');
      }
    }
  }, [allStashes, stakingAccountInfo, stashId, validateInfo]);

  useEffect((): void => {
    if (nominees) {
      setActiveNoms(nominees.filter((id): boolean => !inactiveNoms.includes(id)));
    }
  }, [inactiveNoms, nominees]);

  return (
    <tr className={className}>
      <td className='top'>
        <BondExtra
          controllerId={controllerId}
          isOpen={isBondExtraOpen}
          onClose={toggleBondExtra}
          stashId={stashId}
        />
        <Unbond
          controllerId={controllerId}
          isOpen={isUnbondOpen}
          onClose={toggleUnbond}
          stashId={stashId}
        />
        <Validate
          controllerId={controllerId}
          isOpen={isValidateOpen}
          onClose={toggleValidate}
          stashId={stashId}
          validatorPrefs={validatorPrefs}
        />
        {isInjectOpen && (
          <InjectKeys onClose={toggleInject} />
        )}
        {isNominateOpen && controllerId && (
          <Nominate
            controllerId={controllerId}
            next={next}
            nominees={nominees}
            onClose={toggleNominate}
            stakingOverview={stakingOverview}
            stashId={stashId}
          />
        )}
        {isSetControllerOpen && (
          <SetControllerAccount
            defaultControllerId={controllerId}
            isValidating={isStashValidating}
            onClose={toggleSetController}
            stashId={stashId}
          />
        )}
        {isRewardDestinationOpen && controllerId && (
          <SetRewardDestination
            controllerId={controllerId}
            defaultDestination={destination}
            onClose={toggleRewardDestination}
          />
        )}
        {controllerId && (
          <SetSessionKey
            controllerId={controllerId}
            isOpen={isSetSessionOpen}
            onClose={toggleSetSession}
            sessionIds={sessionKeys}
            stashId={stashId}
          />
        )}
        <AddressSmall value={stashId} />
      </td>
      <td className='top '>
        <AddressMini
          className='mini-nopad'
          label={t('controller')}
          value={controllerId}
        />
      </td>
      <td className='top'>
        <AddressInfo
          address={stashId}
          withBalance={{
            available: false,
            bonded: true,
            free: false,
            redeemable: true,
            unlocking: true
          }}
          withRewardDestination
        />
      </td>
      {isStashValidating
        ? (
          <td className='top'>
            <AddressInfo
              address={stashId}
              withBalance={false}
              withHexSessionId={hexSessionIdNext !== '0x' && [hexSessionIdQueue, hexSessionIdNext]}
              withValidatorPrefs
            />
          </td>
        )
        : (
          <td>
            {isStashNominating && (
              <>
                {activeNoms.length !== 0 && (
                  <details>
                    <summary>{t('Active nominations ({{count}})', { replace: { count: activeNoms.length } })}</summary>
                    {activeNoms.map((nomineeId, index): React.ReactNode => (
                      <AddressMini
                        key={index}
                        value={nomineeId}
                        withBalance={false}
                        withBonded
                      />
                    ))}
                  </details>
                )}
                {inactiveNoms.length !== 0 && (
                  <details>
                    <summary>{t('Inactive nominations ({{count}})', { replace: { count: inactiveNoms.length } })}</summary>
                    {inactiveNoms.map((nomineeId, index): React.ReactNode => (
                      <AddressMini
                        key={index}
                        value={nomineeId}
                        withBalance={false}
                        withBonded
                      />
                    ))}
                  </details>
                )}
              </>
            )}
          </td>
        )
      }
      <td className='top number together'>
        {isLoading
          ? null
          : (
            <>
              {(isStashNominating || isStashValidating)
                ? (
                  <TxButton
                    accountId={controllerId}
                    isNegative
                    label={
                      isStashNominating
                        ? t('Stop Nominating')
                        : t('Stop Validating')
                    }
                    icon='stop'
                    key='stop'
                    tx='staking.chill'
                  />
                )
                : (
                  <Button.Group>
                    {(!sessionKeys.length || hexSessionIdNext === '0x')
                      ? (
                        <Button
                          isPrimary
                          key='set'
                          onClick={toggleSetSession}
                          label={t('Session Key')}
                          icon='sign-in'
                        />
                      )
                      : (
                        <Button
                          isPrimary
                          key='validate'
                          onClick={toggleValidate}
                          label={t('Validate')}
                          icon='check circle outline'
                        />
                      )
                    }
                    <Button.Or key='nominate.or' />
                    <Button
                      isPrimary
                      key='nominate'
                      onClick={toggleNominate}
                      label={t('Nominate')}
                      icon='hand paper outline'
                    />
                  </Button.Group>
                )
              }
              <Popup
                key='settings'
                onClose={toggleSettings}
                open={isSettingsOpen}
                position='bottom right'
                trigger={
                  <Button
                    icon='setting'
                    onClick={toggleSettings}
                  />
                }
              >
                <Menu
                  vertical
                  text
                  onClick={toggleSettings}
                >
                  {freeBalance?.gtn(0) && (
                    <Menu.Item
                      disabled={!isOwnStash}
                      onClick={toggleBondExtra}
                    >
                      {t('Bond more funds')}
                    </Menu.Item>
                  )}
                  <Menu.Item
                    disabled={!isOwnController}
                    onClick={toggleUnbond}
                  >
                    {t('Unbond funds')}
                  </Menu.Item>
                  <Menu.Item
                    disabled={!isOwnStash}
                    onClick={toggleSetController}
                  >
                    {t('Change controller account')}
                  </Menu.Item>
                  <Menu.Item
                    disabled={!isOwnController}
                    onClick={toggleRewardDestination}
                  >
                    {t('Change reward destination')}
                  </Menu.Item>
                  {isStashValidating &&
                    <Menu.Item
                      disabled={!isOwnController}
                      onClick={toggleValidate}
                    >
                      {t('Change validator preferences')}
                    </Menu.Item>
                  }
                  {!isStashNominating &&
                    <Menu.Item
                      disabled={!isOwnController}
                      onClick={toggleSetSession}
                    >
                      {t('Change session keys')}
                    </Menu.Item>
                  }
                  {isStashNominating &&
                    <Menu.Item
                      disabled={!isOwnController}
                      onClick={toggleNominate}
                    >
                      {t('Set nominees')}
                    </Menu.Item>
                  }
                  {!isStashNominating &&
                    <Menu.Item onClick={toggleInject}>
                      {t('Inject session keys (advanced)')}
                    </Menu.Item>
                  }
                </Menu>
              </Popup>
            </>
          )
        }
      </td>
    </tr>
  );
}

export default styled(Account)`
  .ui--Button-Group {
    display: inline-block;
    margin-right: 0.25rem;
    vertical-align: inherit;
  }

  .mini-nopad {
    padding: 0;
  }
`;
