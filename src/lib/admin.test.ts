import { describe, expect, it } from "vitest";
import { parseTicketCode, stripQuotedReply, ticketNumberFrom } from "./admin";

describe("ticket emails", () => {
  it("finds the ticket from the reply address or the subject", () => {
    expect(ticketNumberFrom(["support+ks1003@inbox.keystub.com"], "Re: hello")).toBe(1003);
    expect(ticketNumberFrom(["Support <SUPPORT+KS1004@inbox.keystub.com>"], "")).toBe(1004);
    expect(ticketNumberFrom(["support@inbox.keystub.com"], "Re: [#KS1005] My question")).toBe(1005);
    expect(ticketNumberFrom(["support@inbox.keystub.com"], "Question about my account")).toBeNull();
  });

  it("keeps only the new part of a reply", () => {
    const gmail = "Thanks, that worked!\n\nOn Mon, Nov 9, 2026 at 2:06 PM KeyStub Support <support@keystub.com> wrote:\n> Hi! Thanks for reporting this.";
    expect(stripQuotedReply(gmail)).toBe("Thanks, that worked!");
    const iphone = "Got it, thank you\r\n\r\nSent from my iPhone\r\n\r\n> On Nov 9 wrote:";
    expect(stripQuotedReply(iphone)).toBe("Got it, thank you");
    const outlook = "Still broken on my phone.\n\nFrom: KeyStub Support\nSent: Monday";
    expect(stripQuotedReply(outlook)).toBe("Still broken on my phone.");
  });

  it("reads ticket codes typed into search", () => {
    expect(parseTicketCode("#KS1001")).toBe(1001);
    expect(parseTicketCode("ks-1002")).toBe(1002);
    expect(parseTicketCode("1003")).toBe(1003);
    expect(parseTicketCode("brakes")).toBeNull();
  });
});
