const awsconfig = {
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_AWS_REGION,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
    },
  },
}

export default awsconfig