# Seahorse Solana program for User Story 2
from seahorse.prelude import *

declare_id('34RNydfkFZmhvUupbW1qHBG5LmASc6zeS3tuUsw6PwC5')

class BettingAccount(Account):
    owner: Pubkey
    balance: u64
    total_deposited: u64

@instruction
def create_betting_account(signer: Signer, betting_account: Empty[BettingAccount]):
    betting_account.init(
        payer=signer,
        seeds=['betting', signer]
    )
    betting_account.owner = signer.key()
    betting_account.balance = 0
    betting_account.total_deposited = 0

@instruction
def deposit_sol(signer: Signer, betting_account: BettingAccount, amount: u64):
    # Verify ownership
    assert betting_account.owner == signer.key(), 'Unauthorized'
    
    # Transfer SOL
    system_program.transfer(
        from_=signer,
        to=betting_account,
        lamports=amount
    )
    
    # Update balance
    betting_account.balance += amount
    betting_account.total_deposited += amount
