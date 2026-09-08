import config from "../config";
import redisClient from "./redis";

export const getBkashIdToken = async () => {
	try {
		const IdTokenKey = "bkash:idToken";
		const RefreshTokenKey = "bkash:refreshToken";

		let bkashIdToken = await redisClient.get(IdTokenKey);
		let bkashRefreshToken = await redisClient.get(RefreshTokenKey);

        const bkashIdTokenTTL = await redisClient.ttl(IdTokenKey);
        const bkashRefreshTokenTTL = await redisClient.ttl(RefreshTokenKey)

        //? if bkash id token is not found but bkash refresh token is still there
		if (bkashIdTokenTTL <= 600 && bkashRefreshToken) {
			const refreshTokenResponse = await fetch(
				`${config.bkash.base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash.username,
						password: config.bkash.password,
					},
					body: JSON.stringify({
						app_key: config.bkash.api_key,
						app_secret: config.bkash.api_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);

            const bkashRefreshTokenResponse = await refreshTokenResponse.json();

            bkashIdToken = bkashRefreshTokenResponse.id_token as string;

            //? setting the radis token again
            await redisClient.set(IdTokenKey, bkashIdToken, {
                expiration : {
                    type : "EX",
                    value : 60 * 60
                }
            })

            return  bkashIdToken;
		}

		if (bkashIdToken) {
			return bkashIdToken;
		}

		const response = await fetch(
			`${config.bkash.base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash.username,
					password: config.bkash.password,
				},
				body: JSON.stringify({
					app_key: config.bkash.api_key,
					app_secret: config.bkash.api_secret,
				}),
			},
		);

		if (!response.ok) {
			throw new Error("Bkash Access Token Grant Failure.");
		}

		const result = await response.json();

		//? setting the bkash id token
		await redisClient.set(IdTokenKey, result.id_token, {
			expiration: {
				type: "EX",
				value: 60 * 60,
			},
		});

		//? setting the bkash refresh token
		await redisClient.set(RefreshTokenKey, result.refresh_token, {
			expiration: {
				type: "EX",
				value: 60 * 60 * 24 * 28,
			},
		});
		bkashIdToken = result.id_token;
		return bkashIdToken;
	} catch (error: any) {
		throw new Error(error.message);
	}
};
