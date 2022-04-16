//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Operation.js - 2022-04-14_01
//
// A blocking operation that waits for one or multiple async tasks.
//

const Sys               = require ("./System");
const Util              = require ("./Util");
const ProgressIndicator = require ("./ProgressIndicator_Line");

class Operation
{
    Caption           = null;
    Type              = null;
    Promises          = null;
    ProgressIndicator = null;

    async Execute ( {caption = null, type = null} = {}, promise)
    {
        this.Caption = caption;
        this.Type    = type;

        const cmd = Sys.GetMain ().GetActiveCommand ();

        if (cmd == null)
            return Sys.ERR_PROGRAM ("Tried to start an operation outside a command: '" + this.toString() + "'");

        else if (cmd.StartOperation (this) )
            return false;            

        else
        {
            if (Sys.IsProgressIndicatorEnabled () )
            {
                this.ProgressIndicator = new ProgressIndicator ();
                this.Promises = [ promise, this.ProgressIndicator.Start ( {caption: caption} ) ];
            }
            else
            {
                this.ProgressIndicator = null;
                this.Promises = [ promise ];
            }
            
        }

        Sys.DEBUG ("Operation '" + this.Caption + "' started.");
        
        const result = await Promise.race (this.Promises);
        this.ProgressIndicator?.Stop ();
        
        Sys.DEBUG ("Operation '" + this.Caption + "' finished.");

        return result;
    }

    toString () 
    { 
        return "Operation '" + this.Caption + "' of Type:" + this.Type + " with " + Util.GetAmountStr (this.Promises?.length, "promise", "promises") ;
    }
}


module.exports = Operation;
