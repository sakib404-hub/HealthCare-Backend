export class AppError extends Error {
    public statusCode : number;

    constructor (statusCode: number, message : string, stack ? : string ){
        super(message); //? calling the throw new Error

        this.statusCode = statusCode;


        //? if the stack is not found
        if(stack){
            this.stack = stack;
        }else {
            Error.captureStackTrace(this, this.constructor); 
        }
    }
}