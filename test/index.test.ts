import { describe, expect, it } from "vitest";

import { transform } from "../src/core/transform";

describe("should", () => {
  it("transform", () => {
    const code = `
import { defineComponent } from "vue";

interface Props<T> {
  a: number;
  b: {
    some: boolean
  }
}

type P1 = {
  a: 1
}

const Foo = defineComponent(
  <T>(props: P1<T>) => {
    return <div>{props}</div>;
  },
);

const Bar = defineComponent(
  <T>(props: P1<T>) => {
    return <div>{props}</div>;
  },
);
`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform default export", () => {
    const code = `
import { defineComponent } from "vue";

interface Props<T> {
  a: number;
  b: {
    some: boolean
  }
}
export default defineComponent(
  <T>(props: Props<T>) => {
    return <div>{props}</div>;
  },
);
`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform non-functional components", () => {
    const code = `
import { defineComponent } from "vue";

type Props = {
  foo: number
}

const Foo = defineComponent({
  setup(props: Props) {
    return () => <div>{props}</div>;
  },
});`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform complex type", () => {
    const code = `
import { defineComponent } from "vue";

type Props = 1 extends 1 ? {
  foo: number
} : { a: string }

const Foo = defineComponent({
  setup(props: Props) {
    return () => <div>{props}</div>;
  },
});`;
    expect(transform(code)).toMatchSnapshot();
  });
});
