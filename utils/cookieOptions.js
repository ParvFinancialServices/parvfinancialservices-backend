const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export const getAccessTokenCookieOptions = () => ({
  ...baseCookieOptions,
  maxAge: 15 * 60 * 1000,
});

export const getRefreshTokenCookieOptions = () => ({
  ...baseCookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

export const getClearedCookieOptions = () => ({
  ...baseCookieOptions,
  expires: new Date(0),
  maxAge: 0,
});
