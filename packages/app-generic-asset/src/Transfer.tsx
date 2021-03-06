// Copyright 2019 @polkadot/app-generic-asset authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { I18nProps } from '@polkadot/react-components/types';
import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button, InputAddress, InputBalance, TxButton, Dropdown } from '@polkadot/react-components';
import { useApi, useCall } from '@polkadot/react-hooks';
import Available from './Available';
import Checks from '@polkadot/react-signer/Checks';
import { withMulti, withObservable } from '@polkadot/react-api/hoc';
import { u8aToString } from '@polkadot/util';
import assetRegistry, { AssetsSubjectInfo } from './assetsRegistry';
import translate from './translate';

interface Props extends I18nProps {
  className?: string;
  onClose: () => void;
  recipientId?: string;
  senderId?: string;
  assets?: AssetsSubjectInfo;
}

interface Option {
  text: string;
  value: string;
}

function Transfer ({ assets, className, onClose, recipientId: propRecipientId, senderId: propSenderId, t }: Props): React.ReactElement<Props> {
  const { api } = useApi();
  const [assetId, setAssetId] = useState('0');
  const [amount, setAmount] = useState<BN | undefined>(new BN(0));
  const [extrinsic, setExtrinsic] = useState<SubmittableExtrinsic | null>(null);
  const [hasAvailable, setHasAvailable] = useState(true);
  const [hasBalance, setHasBalance] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [recipientId, setRecipientId] = useState(propRecipientId || null);
  const [senderId, setSenderId] = useState(propSenderId || null);
  let id = assetId;
  let user = senderId;
  const assetBalance = useCall<Balance>(api.query.genericAsset.freeBalance as any, [id, user]);

  const retrivedAssetList = useCall<any>(
    // @ts-ignore
    api.rpc.genericAsset.registeredAssets as any,
    []
  );

  const dropdownOptions = retrivedAssetList && retrivedAssetList.length > 0 && retrivedAssetList.map((asset: any) => {
    const [assetId, assetInfo] = asset;

    return {
      text: u8aToString(assetInfo.symbol),
      value: assetId.toString()
    };
  });

  useEffect((): void => {
    setOptions(dropdownOptions || []);
  }, [retrivedAssetList]);

  useEffect((): void => {
    setHasBalance((assetBalance !== undefined) && !assetBalance.isZero());
    setHasAvailable((amount !== undefined) && !amount.isZero());
  }, [assetBalance, amount]);

  // create an extrinsic if we have correct values
  useEffect((): void => {
    setExtrinsic(
      recipientId && senderId && amount
        ? api.tx.genericAsset.transfer(assetId, recipientId, amount)
        : null
    );
  }, [amount, assetId, recipientId, senderId]);

  const transferrable = <span className='label'>{t('transferrable')}</span>;

  return (
    <div>
      <div className={className}>
        <InputAddress
          defaultValue={propSenderId}
          help={t('The account you will send funds from.')}
          isDisabled={!!propSenderId}
          label={t('send from account')}
          labelExtra={<Available label={transferrable} params={senderId} />}
          isError={!hasBalance}
          onChange={setSenderId}
          type='account'
        />
        <InputAddress
          defaultValue={propRecipientId}
          help={t('Select a contact or paste the address you want to send funds to.')}
          isDisabled={!!propRecipientId}
          label={t('send to address')}
          labelExtra={<Available label={transferrable} params={recipientId} />}
          onChange={setRecipientId}
          type='allPlus'
        />
        <Dropdown
          help={t('Select the asset you want to transfer.')}
          label={t('asset')}
          onChange={setAssetId}
          options={options}
          value={assetId}
        />
        <InputBalance
          help={t('Enter the amount you want to transfer.')}
          isError={!hasAvailable}
          label={t('amount')}
          onChange={setAmount}
        />
        <Checks
          accountId={senderId}
          extrinsic={extrinsic}
          isSendable
          onChange={setHasAvailable}
        />
      </div>
      <Button.Group>
        <TxButton
          accountId={senderId}
          extrinsic={extrinsic}
          isDisabled={!hasAvailable || !hasBalance}
          isPrimary
          label={t('Make Transfer')}
          icon='send'
          onStart={onClose}
        />
      </Button.Group>
    </div>
  );
}

export default withMulti(
  styled(Transfer)`
    article.padded {
      box-shadow: none;
      margin-left: 2rem;
    }

    .balance {
      margin-bottom: 0.5rem;
      text-align: right;
      padding-right: 1rem;

      .label {
        opacity: 0.7;
      }
    }

    label.with-help {
      flex-basis: 10rem;
    }
  `,
  translate,
  withObservable(assetRegistry.subject, { propName: 'assets' })
);
