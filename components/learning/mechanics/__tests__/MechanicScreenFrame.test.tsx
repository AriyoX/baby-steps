import React from "react";
import { ScrollView, View } from "react-native";
import renderer, { act } from "react-test-renderer";
import { TourTarget } from "@/components/games/GameTour";
import { MechanicScreenFrame } from "../MechanicScreenFrame";

describe("MechanicScreenFrame", () => {
  it("keeps the choice action and its help target separate from feedback and scrolling", () => {
    let tree: renderer.ReactTestRenderer | undefined;

    act(() => {
      tree = renderer.create(
        <MechanicScreenFrame
          isShortScreen
          surface="panel"
          footer={<View testID="next-action" />}
          footerAside={<View testID="answer-feedback" />}
        >
          <View testID="choices" />
        </MechanicScreenFrame>,
      );
    });

    if (!tree) throw new Error("MechanicScreenFrame did not mount");
    const mountedTree = tree;
    const actionTarget = mountedTree.root.findAllByType(TourTarget)
      .find((target) => target.props.id === "learning-lesson-action");
    const scrollView = mountedTree.root.findByType(ScrollView);

    expect(actionTarget?.findAllByType(View)
      .filter((view) => view.props.testID === "next-action")).toHaveLength(1);
    expect(actionTarget?.findAllByProps({ testID: "answer-feedback" })).toHaveLength(0);
    expect(scrollView.findAllByProps({ testID: "next-action" })).toHaveLength(0);
    expect(scrollView.findAllByProps({ testID: "answer-feedback" })).toHaveLength(0);

    act(() => mountedTree.unmount());
  });

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
    expect(scrollView.props.contentContainerStyle.justifyContent).toBe("flex-start");
    expect(scrollView.findAllByProps({ testID: "footer" })).toHaveLength(0);
  });
});
