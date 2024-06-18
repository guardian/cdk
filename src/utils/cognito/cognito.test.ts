import { getUserPoolDomainPrefix } from "./cognito";

describe("getUserPoolDomainPrefix", () => {
  it("should use a full length hash where there is space", () => {
    const shortPrefix = "hello";
    const domainPrefix = getUserPoolDomainPrefix(shortPrefix);

    expect(domainPrefix.length).toEqual(32+shortPrefix.length+1)
  });

  it("should include the full prefix where there is space for a 5 character hash", () => {
    const prefix55 = new Array(55 + 1).join( "#" );
    const domainPrefix = getUserPoolDomainPrefix(prefix55);

    expect(domainPrefix.includes(prefix55)).toEqual(true)
    expect(domainPrefix.length).toEqual(63)
  });

  it("should not include the full prefix where there is not space for a 5 character hash", () => {
    const prefix56 = new Array(58 + 1).join( "#" );
    const domainPrefix = getUserPoolDomainPrefix(prefix56);

    expect(domainPrefix.includes(prefix56)).toEqual(false)
    expect(domainPrefix.length).toEqual(63)
  })

  it("should be 63 characters long even with a very long prefix", () => {
    const prefix = new Array(63 + 1).join( "#" );
    const domainPrefix = getUserPoolDomainPrefix(prefix);

    expect(domainPrefix.length).toEqual(63)
  })

});
