import config from "../config"

export const getBkashIdToken = async()=>{

    const response = await fetch(`${config.bkash.base_url}/tokenized/checkout/token/grant`, {
        method : "POST",
        headers : {
            "Content-Type" : "application/json",
            Accept : "application/json",
            username : config.bkash.username,
            password : config.bkash.password
        },
        body : JSON.stringify({
            app_key : config.bkash.api_key,
            app_secret : config.bkash.api_secret
        })
    })

    const result = response.json();
    return result;
}