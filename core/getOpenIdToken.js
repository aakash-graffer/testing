const AWS = require('aws-sdk');
const moment = require('moment');


// Get open id token for developer identity
exports.getOpenIdToken = async (req) => {
    try {

        // console.log("getOpenIdToken__MEHTOD");
        let PoolID = "ap-south-1:de1e4fd8-354a-427d-8639-ca828ba9adc0";

        printLogger(2, `PoolID-if - ${PoolID}`, 'rupyo_admin');

        let params = {
            IdentityPoolId: PoolID,
            Logins: {}
        };

        params.Logins["s3.cognito.rupyo"] = req.userData._id;

        AWS.config.update({ region: 'ap-south-1' });

        let cognitoidentity = new AWS.CognitoIdentity();

        let awsResult = await cognitoidentity.getOpenIdTokenForDeveloperIdentity(params).promise()

        awsData = {
            "identity_id": awsResult.IdentityId,
            "token": awsResult.Token,
            "identity_pool_id": PoolID,
            "bucket": "rupyo-private",
            "s3_bucket_region": "ap-south-1"
        };

        return awsData;
    }
    catch (error) {

        return 0;
    }
};


// Get cloud front url
exports.getCloudFrontURL = async (req) => {
    try {

        let cfsign = require('aws-cloudfront-sign');

        let signingParams = {
            keypairId: "K31J872C2O7K6I",// process.env.PUBLIC_KEY,

            //  privateKeyString: process.env.PRIVATE_KEY,
            // Optional - this can be used as an alternative to privateKeyString
            privateKeyPath: './path/rupyo-cloudfront.pem',
            expireTime: moment().utc().add(30, 'seconds').valueOf()
        }

        // Generating a signed URL
        let signedUrl = cfsign.getSignedUrl(
            'https://dn99om0uxxjux.cloudfront.net/' + req,
            signingParams
        );

        return signedUrl;
    }
    catch (error) {

        return 0;
    }
};