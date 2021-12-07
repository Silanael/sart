// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Arguments.js - 2021-12-07_01
//
// Command-arguments.
//


class Args
{
    constructor (argv)
    {
        this._Argv = argv;
        this._Pos = 0;
    }


    HasNext   () { return this._Argv != null && this._Pos < this._Argv.length; }
    PopLC     () { return this.Pop ()?.toLowerCase ();                         }
    PopUC     () { return this.Pop ()?.toUpperCase ();                         }
    Peek      () { return this._Argv[this._Pos];                               }
    GetAmount () { return this._Argv.length - this._Pos; }
    

    RequireAmount (amount, msg = null)
    { 
        // This should exit.
        if (this._Argv.length - this._Pos < amount)
        {
            Sys.ERR_MISSING_ARG (msg);
            return null;
        }
            
        return this;
    }
    

    Pop ()
    {
        if (this.HasNext () )
        {
            const arg = this._Argv[this._Pos];
            ++this._Pos;
            return arg;
        }
        else
            return null;
    }


    RemainingToStr ()
    { 
        let str = this._Argv[this._Pos];         
        for (let C = this._Pos + 1 ; C < this._Argv.length; ++C)
        {
            str += " " + this._Argv[C];
        }        
    }
        
}
