# Example Input Cases

## Mint Page Form

### Case 1: Standard institutional mint

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "100000.00",
  "destinationWallet": "7Yq9pKcrHfXpQvW8mQkP3KXrVwR4cD2u8s3N6Lz5pQaM",
  "wireReference": "FW-2026-03-29-884231",
  "sendingBank": "JPMorgan Chase",
  "bankSwiftBic": "CHASUS33",
  "transferDate": "2026-03-29",
  "settlementCurrency": "USD"
}
```

### Case 2: Large mint with EUR settlement

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "2500000.00",
  "destinationWallet": "9r7xVh4mYz2Jt6QdLp8Nc5sAa1Wu3Ef7Bg0Km2Px4RnS",
  "wireReference": "SWIFT-DEUTDEFF-778102",
  "sendingBank": "Deutsche Bank AG",
  "bankSwiftBic": "DEUTDEFF",
  "transferDate": "2026-03-28",
  "settlementCurrency": "EUR"
}
```

### Case 3: Minimal required mint submission

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "5000.00",
  "destinationWallet": "4gk3Jp8Lm2Xv9Qz7Aa1Dk5Pw6Rb3Ht8Ys0Nc2Mf7VuTe",
  "wireReference": "",
  "sendingBank": "",
  "bankSwiftBic": "",
  "transferDate": "2026-03-29",
  "settlementCurrency": "USD"
}
```

### Case 4: Validation failure example

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "",
  "destinationWallet": "invalid-wallet-address",
  "wireReference": "TEST-REF-001",
  "sendingBank": "Test Bank",
  "bankSwiftBic": "BADCODE",
  "transferDate": "2026-03-29",
  "settlementCurrency": "USD"
}
```

## Redeem Page Form

### Case 1: Standard redeem to SWIFT account

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "50000.00",
  "sourceWallet": "7Yq9pKcrHfXpQvW8mQkP3KXrVwR4cD2u8s3N6Lz5pQaM",
  "destinationBankAccount": "GB29NWBK60161331926819",
  "accountHolderName": "AMINA Bank AG ",
  "beneficiaryBank": "NatWest",
  "bankSwiftBic": "NWBKGB2L",
  "paymentRails": "SWIFT",
  "transferReference": "RED-2026-03-29-0001"
}
```

### Case 2: SEPA redeem for EU beneficiary

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "125000.00",
  "sourceWallet": "9r7xVh4mYz2Jt6QdLp8Nc5sAa1Wu3Ef7Bg0Km2Px4RnS",
  "destinationBankAccount": "DE89370400440532013000",
  "accountHolderName": "Rem Europe Treasury GmbH",
  "beneficiaryBank": "Commerzbank",
  "bankSwiftBic": "COBADEFFXXX",
  "paymentRails": "SEPA",
  "transferReference": "SEPA-REDEEM-8842"
}
```

### Case 3: Redeem without optional transfer reference

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "10000.00",
  "sourceWallet": "4gk3Jp8Lm2Xv9Qz7Aa1Dk5Pw6Rb3Ht8Ys0Nc2Mf7VuTe",
  "destinationBankAccount": "US12345678901234567890",
  "accountHolderName": "Northwind Treasury Inc",
  "beneficiaryBank": "Bank of America",
  "bankSwiftBic": "BOFAUS3N",
  "paymentRails": "ACH",
  "transferReference": ""
}
```

### Case 4: Validation failure example

```json
{
  "network": "solana-devnet",
  "stablecoinSymbol": "USX",
  "amount": "0",
  "sourceWallet": "bad-wallet",
  "destinationBankAccount": "",
  "accountHolderName": "",
  "beneficiaryBank": "",
  "bankSwiftBic": "123",
  "paymentRails": "SWIFT",
  "transferReference": "INVALID-CASE"
}
```
