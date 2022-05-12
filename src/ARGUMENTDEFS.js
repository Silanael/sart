const ArgDef = require ("./ArgumentDef");

module.exports = 
{
    WalletFile: new ArgDef ("walletfile")
                .WithAliases ("wallet", "w")
                .WithHasParam ()
                .WithDescription ("Path to the wallet.json."),

}