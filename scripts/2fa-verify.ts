import Speakeasy from "speakeasy";

process.nextTick(async () => {
	const secret = "IFWE2QB7LBXX2MKOFB2HCR2DKA";
	const token = "430384";
	console.log(Speakeasy.totp.verify({
		secret,
		encoding: "base32",
		token,
		step: 30,
		window: 2
	}));
});
