import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import {
    DEFAULT_SOLANA_DERIVATION_PATH,
    resolveSolanaKeypair,
} from '../packages/adapters/src/solana-keypair';

async function main() {
    const rpcUrl = process.env['SOLANA_RPC_URL'] ?? clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');
    const publicKey = process.env['MOCK_BANK_OPERATOR_PUBLIC_KEY'];
    const seedPhrase = process.env['MOCK_BANK_OPERATOR_SEED_PHRASE'];

    let mintAuthority: Keypair;
    let usedProvidedWallet = false;

    if (seedPhrase || process.env['MOCK_BANK_MINT_AUTHORITY_KEY']) {
        mintAuthority = resolveSolanaKeypair({
            publicKey,
            secretKeyBase64: process.env['MOCK_BANK_MINT_AUTHORITY_KEY'],
            seedPhrase,
        });
        usedProvidedWallet = true;
        console.log('Using funded operator wallet:', mintAuthority.publicKey.toBase58());
        console.log(`Assuming standard Solana derivation path: ${DEFAULT_SOLANA_DERIVATION_PATH}`);
    } else {
        mintAuthority = Keypair.generate();
        console.log('Generated mint authority public key:', mintAuthority.publicKey.toBase58());
        console.log('No operator seed phrase provided. Fund this wallet manually before re-running.');
        console.log(`MOCK_BANK_OPERATOR_PUBLIC_KEY=${mintAuthority.publicKey.toBase58()}`);
        console.log(`MOCK_BANK_MINT_AUTHORITY_KEY=${Buffer.from(mintAuthority.secretKey).toString('base64')}`);
        process.exit(1);
    }

    const balance = await connection.getBalance(mintAuthority.publicKey);
    console.log(`Operator wallet balance: ${balance / 1_000_000_000} SOL`);
    if (balance <= 0) {
        console.log('Wallet has no SOL. Requesting a 0.9 SOL devnet airdrop...');
        const airdropSignature = await connection.requestAirdrop(
            mintAuthority.publicKey,
            Math.floor(0.9 * LAMPORTS_PER_SOL),
        );
        await connection.confirmTransaction(airdropSignature, 'confirmed');

        const refreshedBalance = await connection.getBalance(mintAuthority.publicKey);
        console.log(`Operator wallet balance after airdrop: ${refreshedBalance / 1_000_000_000} SOL`);
        if (refreshedBalance <= 0) {
            throw new Error('Airdrop did not fund the operator wallet. Please fund it manually and re-run the deploy script.');
        }
    }

    // Create the SPL mint (6 decimals — same as USDC)
    const mint = await createMint(
        connection,
        mintAuthority,       // payer
        mintAuthority.publicKey, // mint authority
        null,                // freeze authority (null = no freeze)
        6,                   // decimals
    );

    console.log('\n✅ MockBankUSD SPL token deployed to devnet');
    console.log('─'.repeat(60));
    console.log('Add these to your .env file:\n');
    console.log(`MOCK_BANK_MINT_ADDRESS=${mint.toBase58()}`);
    if (!usedProvidedWallet) {
        console.log(`MOCK_BANK_MINT_AUTHORITY_KEY=${Buffer.from(mintAuthority.secretKey).toString('base64')}`);
    } else {
        console.log(`MOCK_BANK_OPERATOR_PUBLIC_KEY=${mintAuthority.publicKey.toBase58()}`);
    }
    console.log('─'.repeat(60));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
