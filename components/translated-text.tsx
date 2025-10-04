"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Text } from "@/components/StyledText"
import { useLanguage } from "@/context/language-context"

export const TranslatedText = (props: React.ComponentProps<typeof Text>) => {
  const { children, ...rest } = props
  const { isLuganda, translate } = useLanguage()
  const [translated, setTranslated] = useState(children)

  // Update translation when language or text changes
  useEffect(() => {
    if (typeof children !== "string") {
      setTranslated(children)
      return
    }

    // Use the hardcoded translations
    setTranslated(translate(children))
  }, [children, isLuganda, translate])

  return <Text {...rest}>{translated}</Text>
}
