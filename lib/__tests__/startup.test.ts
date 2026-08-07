import { waitForStartupTask } from "../startup"

describe("startup task deadline", () => {
  it("returns local work immediately when it resolves", async () => {
    await expect(waitForStartupTask(Promise.resolve("ready"), 100)).resolves.toEqual({
      status: "resolved",
      value: "ready",
    })
  })

  it("releases startup while leaving delayed work able to finish", async () => {
    jest.useFakeTimers()
    try {
      let finish!: (value: string) => void
      const delayedTask = new Promise<string>((resolve) => {
        finish = resolve
      })
      const startupResult = waitForStartupTask(delayedTask, 100)

      jest.advanceTimersByTime(100)
      await expect(startupResult).resolves.toEqual({ status: "timed-out" })

      finish("restored later")
      await expect(delayedTask).resolves.toBe("restored later")
    } finally {
      jest.useRealTimers()
    }
  })
})
