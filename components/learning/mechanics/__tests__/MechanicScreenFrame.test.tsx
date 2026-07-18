import React from "react";
import { ScrollView, View } from "react-native";
import renderer, { act } from "react-test-renderer";
import { MechanicScreenFrame } from "../MechanicScreenFrame";

describe("MechanicScreenFrame", () => {
  it("only enables vertical scrolling when its content overflows", () => {
    let tree: renderer.ReactTestRenderer | undefined;

    act(() => {
      tree = renderer.create(
        <MechanicScreenFrame
          isShortScreen
          footer={<View testID="footer" />}
        >
          <View testID="content" />
        </MechanicScreenFrame>,
      );
    });

    if (!tree) {
      throw new Error("MechanicScreenFrame did not mount");
    }

    let scrollView = tree.root.findByType(ScrollView);
    expect(scrollView.props.scrollEnabled).toBe(false);
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(false);

    act(() => {
      scrollView.props.onLayout({ nativeEvent: { layout: { height: 200 } } });
      scrollView.props.onContentSizeChange(320, 198);
    });

    scrollView = tree.root.findByType(ScrollView);
    expect(scrollView.props.scrollEnabled).toBe(false);

    act(() => {
      scrollView.props.onContentSizeChange(320, 240);
    });

    scrollView = tree.root.findByType(ScrollView);
    expect(scrollView.props.scrollEnabled).toBe(true);
    expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);
  });
});
