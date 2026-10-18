import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { splitSearchExcerpt } from "./safe-excerpt"

describe("splitSearchExcerpt", () => {
  it("preserves Pagefind highlights", () => {
    assert.deepEqual(splitSearchExcerpt("before <mark>match</mark> after"), [
      { text: "before ", highlighted: false },
      { text: "match", highlighted: true },
      { text: " after", highlighted: false },
    ])
  })

  it("leaves unexpected markup as escaped text for React", () => {
    assert.deepEqual(splitSearchExcerpt('<img src=x onerror="alert(1)">'), [
      { text: '<img src=x onerror="alert(1)">', highlighted: false },
    ])
  })
})
