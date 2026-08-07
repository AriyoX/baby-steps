import {
  getConciseChildCardDescription,
  getConciseLearningHubCardDescription,
} from "../childCardCopy"

describe("child card descriptions", () => {
  it("retains only short functional descriptions that do not repeat the title", () => {
    expect(getConciseChildCardDescription("Ebigambo", "Build Luganda words")).toBe(
      "Build Luganda words",
    )
    expect(getConciseChildCardDescription("Counting", "Counting from one to five")).toBeUndefined()
    expect(
      getConciseChildCardDescription(
        "Stories",
        "Enjoy wonderful stories and discover a whole new world today",
      ),
    ).toBeUndefined()

    const retained = getConciseChildCardDescription("Coloring", "Create bright pictures")
    expect(retained?.split(/\s+/)).toHaveLength(3)
  })

  it("uses short Learning Hub descriptions without exposing long curriculum copy", () => {
    const descriptions = [
      getConciseLearningHubCardDescription(
        "first-words",
        "First Words",
        "Start with greetings and kind everyday words.",
      ),
      getConciseLearningHubCardDescription(
        "family-home",
        "Family & Home",
        "Meet family names and familiar things at home.",
      ),
      getConciseLearningHubCardDescription(
        "lg-stage-02-body-feelings",
        "Nze, omubiri gwange n'enneewulira zange",
        "Eight common body parts and four simple feeling statements.",
      ),
    ]

    expect(descriptions).toEqual([
      "Greetings, names, and kind words",
      "Family and home words",
      "Body parts and feelings",
    ])
    descriptions.forEach((description) => {
      expect(description?.split(/\s+/).length).toBeLessThanOrEqual(5)
    })
  })
})
