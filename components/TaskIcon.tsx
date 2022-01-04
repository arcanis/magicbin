import {TaskStatus} from '../sources/types';

export function TaskIcon({status}: {status: TaskStatus}) {
  const {borderClassName, iconRender} = taskIcons.get(status) ?? taskIcons.get(TaskStatus.CANCELLED)!;

  return (
    <svg className={`w-6 flex-none`} viewBox={`0 0 100 100`}>
      <defs>
        <clipPath id={`clip-0`}>
          <circle cx={`50`} cy={`50`} r={`50`}></circle>
        </clipPath>
      </defs>
      {iconRender}
      <circle className={`stroke-current ${borderClassName}`} style={{fill: `none`, strokeWidth: 25, clipPath: `url(#clip-0)`}} cx={`50`} cy={`50`} r={`50`}/>
    </svg>
  );
}

const taskIcons = new Map([
  [TaskStatus.PENDING, {
    borderClassName: `text-yellow-400`,
    iconRender: <WaitIcon/>,
  }],
  [TaskStatus.STARTING, {
    borderClassName: `text-yellow-400`,
    iconRender: <ProgressIcon className={`text-yellow-200`}/>,
  }],
  [TaskStatus.STOPPING, {
    borderClassName: `text-blue-400`,
    iconRender: <CancelledIcon/>,
  }],
  [TaskStatus.CANCELLED, {
    borderClassName: `text-gray-700`,
    iconRender: <CancelledIcon/>,
  }],
  [TaskStatus.FAILED, {
    borderClassName: `text-gray-700`,
    iconRender: <FailureIcon/>,
  }],
  [TaskStatus.RUNNING, {
    borderClassName: `text-blue-400`,
    iconRender: <ProgressIcon className={`text-blue-200`}/>,
  }],
  [TaskStatus.SUCCESS, {
    borderClassName: `text-green-400`,
    iconRender: <SuccessIcon/>,
  }],
]);

export function ProgressIcon({className}: {className: string}) {
  return <>
    <circle className={`fill-current origin-center animate-ping ${className}`} cx={`50`} cy={`50`} r={`10`}></circle>
  </>;
}

export function CancelledIcon() {
  return <>
    <path d={`M 44.947 5.78 H 44.947 V 26.9845 H 69.947 V 34.5755 H 44.947 V 55.78 H 44.947 V 34.5755 H 19.947 V 26.9845 H 44.947 Z`} style={{fill: `rgb(216, 216, 216)`}} transform={`matrix(0.700688, -0.713468, 0.713468, 0.700688, -3.454367, 60.501072)`}></path>
  </>;
}

export function SuccessIcon() {
  return <>
    <path className={`fill-current text-green-400`} d={`M 29.512 47.271 L 44.102 58.382 L 70.141 31.334 L 74.631 35.486 L 44.704 68.667 L 25.369 52.025 L 29.512 47.271 Z`}></path>
  </>;
}

export function FailureIcon() {
  return <>
    <path d={`M 41.152 5.78 H 48.743 V 26.985 H 69.947 V 34.576 H 48.743 V 55.78 H 41.152 V 34.576 H 19.947 V 26.985 H 41.152 Z`} style={{fill: `rgb(216, 216, 216)`}} transform={`matrix(0.700688, -0.713468, 0.713468, 0.700688, -3.454367, 60.501072)`}></path>
  </>;
}

export function PauseIcon() {
  return <>
    <rect width={`8`} height={`34`} style={{fill: `#9ca3af`}} y={`33`} x={`35`}/>
    <rect width={`8`} height={`34`} style={{fill: `#9ca3af`}} y={`33`} x={`57`}/>
  </>;
}

export function WaitIcon() {
  return <>
    <g className={`animate-hourglass origin-center`}>
      <path className={`fill-current text-yellow-400`} d={`M 50 45 L 65 70 L 35 70 L 50 45 Z`}/>
      <path className={`fill-current text-yellow-400`} d={`M -50 -55 L -35 -30 L -65 -30 L -50 -55 Z`} transform={`matrix(-1, 0, 0, -1, 0, 0)`}/>
    </g>
  </>;
}
