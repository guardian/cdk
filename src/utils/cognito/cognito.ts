import crypto from "crypto";

export const getUserPoolDomainPrefix = (prefix: string): string => {
  // the user pool domain prefix has a max length of 63 characters. We want them to be unique so we add a hash to the end
  // here we hope that a 5 character hash is unique enough to avoid collisions
  const maxLength = 63;
  const prefixLengthWithHashSpace = maxLength - 6; // 6 = 5 char hash, 1 hyphen
  const suffix = crypto.createHash("md5").update(prefix).digest("hex");

  // make space in prefix for hash
  const prefixTrimmed = prefix.slice(0, prefixLengthWithHashSpace);

  return `${prefixTrimmed}-${suffix}`.slice(0, maxLength);
};
