import React from "react";
import renderer, { act } from "react-test-renderer";
import { TouchableOpacity } from "react-native";
import { ChildLoadingCard, ChildLoadingState } from "../ChildLoadingState";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View: MockView } = jest.requireActual("react-native");
    return <MockView {...props} />;
  },
}));

jest.mock("@/components/brand/BrandMark", () => ({
  BrandMark: (props: Record<string, unknown>) => {
    const { View: MockView } = jest.requireActual("react-native");
    return <MockView {...props} />;
  },
}));

describe("ChildLoadingState", () => {
  it("announces progress and exposes an optional escape action", () => {
    const onBack = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ChildLoadingState
          title="Getting lessons ready"
          message="Loading your progress."
          onBack={onBack}
          backLabel="Back to Learning"
        />,
      );
    });

    const progress = tree!.root.findByProps({ accessibilityRole: "progressbar" });
    expect(progress.props.accessibilityLabel).toBe("Getting lessons ready");
    expect(progress.props.accessibilityValue).toEqual({ text: "Loading your progress." });

    act(() => tree!.root.findByType(TouchableOpacity).props.onPress());
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps inline loading cards accessible", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ChildLoadingCard label="Loading activities..." />);
    });

    expect(
      tree!.root.findByProps({ accessibilityRole: "progressbar" }).props
        .accessibilityLabel,
    ).toBe("Loading activities...");
  });
});
