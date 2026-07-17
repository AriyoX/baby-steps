import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CachedImage } from "../CachedImage";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: Record<string, unknown>) => {
    const { View: MockView } = jest.requireActual("react-native");
    return <MockView {...props} />;
  },
}));

const layoutEvent = (width: number, height: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width, height } },
});

const errorEvent = {
  nativeEvent: { error: "test image error" },
};

const textContent = (node: unknown): string => {
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";

  const children = (node as { props?: { children?: unknown } }).props?.children;
  return textContent(children);
};

describe("CachedImage", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it("does not flash a loading spinner for images that load quickly", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <CachedImage source={{ uri: "https://example.com/picture.png" }} />,
      );
    });

    expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(0);

    act(() => {
      tree!.root.findByType(Image).props.onLoad();
      jest.advanceTimersByTime(250);
    });

    expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  });

  it("shows delayed progress for a slow image and removes it after success", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <CachedImage
          source={{ uri: "https://example.com/slow.png" }}
          loadingDelayMs={100}
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(1);

    act(() => {
      tree!.root.findByType(Image).props.onLoad();
    });

    expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  });

  it("uses the fallback without rendering overflowing controls in a thumbnail", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<CachedImage source={1} fallbackSource={2} />);
    });

    act(() => {
      tree!.root.findAllByType(View)[0].props.onLayout(layoutEvent(64, 64));
      tree!.root.findByType(Image).props.onError(errorEvent);
    });

    expect(tree!.root.findByType(Image).props.source).toBe(2);

    act(() => {
      tree!.root.findByType(Image).props.onError(errorEvent);
    });

    expect(tree!.root.findAllByType(TouchableOpacity)).toHaveLength(0);
    expect(
      tree!.root.findAllByType(Text).some((node) =>
        textContent(node).includes("Picture coming soon"),
      ),
    ).toBe(false);
  });

  it("offers retry only when a large network image can benefit from it", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <CachedImage source={{ uri: "https://example.com/retry.png" }} />,
      );
    });

    act(() => {
      tree!.root.findAllByType(View)[0].props.onLayout(layoutEvent(240, 180));
      tree!.root.findByType(Image).props.onError(errorEvent);
    });

    const retryButton = tree!.root.findByType(TouchableOpacity);
    expect(retryButton.props.accessibilityLabel).toBe("Try loading picture again");

    act(() => retryButton.props.onPress());

    expect(tree!.root.findAllByType(Image)).toHaveLength(1);
    expect(tree!.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  });

  it("escapes an image load that never emits success or error", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <CachedImage source={1} fallbackSource={2} loadTimeoutMs={500} />,
      );
    });

    act(() => jest.advanceTimersByTime(500));
    expect(tree!.root.findByType(Image).props.source).toBe(2);

    act(() => jest.advanceTimersByTime(500));
    expect(tree!.root.findAllByType(Image)).toHaveLength(0);
    expect(
      tree!.root.findByProps({ accessibilityRole: "image" }).props
        .accessibilityLabel,
    ).toBe("Picture is unavailable");
  });
});
