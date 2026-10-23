'use client'

/** CSS connector-line rules for the CSS tree layout, injected once. */
export default function TreeLinesStyle() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        .css-tree ul {
          padding-top: 30px;
          position: relative;
          display: flex;
          justify-content: center;
          padding-left: 0;
          user-select: none;
        }

        .css-tree li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 30px 5px 0 5px;
        }

        /* Connecting lines */
        .css-tree li::before, .css-tree li::after {
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 2px solid #d6d3d1;
          width: 50%; height: 30px;
        }
        .css-tree li::after {
          right: auto; left: 50%;
          border-left: 2px solid #d6d3d1;
        }

        /* Remove left-right connectors from elements without siblings */
        .css-tree li:only-child::after {
          display: none;
        }
        .css-tree li:only-child::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0;
          height: 30px;
        }

        /* Remove top connector from first child */
        .css-tree ul:first-child > li {
          padding-top: 0px;
        }
        .css-tree ul:first-child > li::before {
          display: none;
        }

        /* Remove left connector from first child and right connector from last child */
        .css-tree li:first-child::before, .css-tree li:last-child::after {
          border: 0 none;
        }

        /* Add back the vertical connector to the last nodes */
        .css-tree li:last-child::before {
          border-right: 2px solid #d6d3d1;
          border-radius: 0 12px 0 0;
        }
        .css-tree li:first-child::after {
          border-radius: 12px 0 0 0;
        }

        /* Downward connectors from parents */
        .css-tree ul ul::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0; height: 30px;
        }

        /* Nhóm con theo từng vợ/chồng: nhãn nằm gọn trong dải nối sẵn
           có (đường nối của nhóm vẫn vẽ xuyên qua phía sau nhãn) để
           các con cùng đời ngang hàng với các nhánh không có nhãn,
           thay vì bị đẩy xuống thêm một tầng. */
        .css-tree li.child-group {
          padding-top: 0;
        }
        .css-tree .group-children {
          padding-top: 0;
        }
        .css-tree .group-children::before {
          display: none;
        }
        .css-tree .group-children > li {
          padding-top: 0;
        }
        .css-tree .group-children > li::before,
        .css-tree .group-children > li::after {
          height: 0;
        }
        .css-tree .group-children > li:only-child::before {
          height: 0;
        }
      `
      }}
    />
  )
}
