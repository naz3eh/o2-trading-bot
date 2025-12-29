// Minimal Fuel Asset Registry ABI for deposit operations
// Full ABI available in o2/fuel-o2/packages/web-services/src/abi/fuel/assetRegistryAbi.ts

export const assetRegistryAbi = {
  programType: 'contract',
  specVersion: '1',
  encodingVersion: '1',
  concreteTypes: [
    {
      type: '()',
      concreteTypeId:
        '2e38e77b22c314a449e91fafed92a43826ac6aa403ae6a8acb6cf58239fbaf5d',
    },
    {
      type: 'b256',
      concreteTypeId:
        '7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b',
    },
    {
      type: 'bool',
      concreteTypeId:
        'b760f44fa5965c2474a3b471467a22c43185152129295af588b022ae50b50903',
    },
    {
      type: 'enum std::identity::Identity',
      concreteTypeId:
        'ab7cd04e05be58e3fc15d424c2c4a57f824a2a2d97d67252440a3925ebdc1335',
      metadataTypeId: 2,
    },
    {
      type: 'struct std::address::Address',
      concreteTypeId:
        'f597b637c3b0f588fb532f40db7ea4bfda95f393a0ccd7d1e5e7bfac7e85c3e3',
      metadataTypeId: 7,
    },
    {
      type: 'struct std::contract_id::ContractId',
      concreteTypeId:
        '29c10735d33b5159f0c71ee1dbd17b36a3e69e41f00fab0d42e1bd9f428d8a54',
      metadataTypeId: 8,
    },
    {
      type: 'u64',
      concreteTypeId:
        '1506e6f44c1d6291cdf46395a8e573276a4fa79e8ace3fc891e092ef32d1b0a0',
    },
  ],
  metadataTypes: [
    {
      type: 'b256',
      metadataTypeId: 0,
    },
    {
      type: 'enum std::identity::Identity',
      metadataTypeId: 2,
      components: [
        {
          name: 'Address',
          typeId: 7,
        },
        {
          name: 'ContractId',
          typeId: 8,
        },
      ],
    },
    {
      type: 'struct std::address::Address',
      metadataTypeId: 7,
      components: [
        {
          name: 'bits',
          typeId: 0,
        },
      ],
    },
    {
      type: 'struct std::contract_id::ContractId',
      metadataTypeId: 8,
      components: [
        {
          name: 'bits',
          typeId: 0,
        },
      ],
    },
  ],
  functions: [
    {
      inputs: [
        {
          name: 'recipient',
          concreteTypeId:
            'ab7cd04e05be58e3fc15d424c2c4a57f824a2a2d97d67252440a3925ebdc1335',
        },
      ],
      name: 'wrap_canonical_asset',
      output:
        'b760f44fa5965c2474a3b471467a22c43185152129295af588b022ae50b50903',
      attributes: [
        {
          name: 'doc-comment',
          arguments: [' Wraps a canonical asset into its wrapped equivalent.'],
        },
        {
          name: 'payable',
          arguments: [],
        },
        {
          name: 'storage',
          arguments: ['read'],
        },
      ],
    },
    {
      inputs: [
        {
          name: 'asset_id',
          concreteTypeId:
            '7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b',
        },
        {
          name: 'recipient',
          concreteTypeId:
            'ab7cd04e05be58e3fc15d424c2c4a57f824a2a2d97d67252440a3925ebdc1335',
        },
      ],
      name: 'unwrap_to_canonical_asset',
      output:
        'b760f44fa5965c2474a3b471467a22c43185152129295af588b022ae50b50903',
      attributes: [
        {
          name: 'doc-comment',
          arguments: [' Unwraps a wrapped asset back to its canonical form.'],
        },
        {
          name: 'payable',
          arguments: [],
        },
        {
          name: 'storage',
          arguments: ['read'],
        },
      ],
    },
    {
      inputs: [
        {
          name: 'canonical_asset_id',
          concreteTypeId:
            '7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b',
        },
      ],
      name: 'get_universal_asset_id',
      output:
        '7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b',
      attributes: [
        {
          name: 'doc-comment',
          arguments: [' Returns the universal asset ID for a canonical asset.'],
        },
        {
          name: 'storage',
          arguments: ['read'],
        },
      ],
    },
    {
      inputs: [
        {
          name: 'universal_asset_id',
          concreteTypeId:
            '7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b',
        },
      ],
      name: 'get_canonical_asset_id',
      output:
        '7c5ee1cecf5f8eacd1284feb5f0bf2bdea533a51e2f0c9aabe9236d335989f3b',
      attributes: [
        {
          name: 'doc-comment',
          arguments: [' Returns the canonical asset ID for a universal asset.'],
        },
        {
          name: 'storage',
          arguments: ['read'],
        },
      ],
    },
  ],
  loggedTypes: [],
  messagesTypes: [],
  configurables: [],
} as const
