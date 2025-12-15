import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#ffffff',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3949ab',
    borderRadius: '50%',
  },
});

const spinnerStyle = {
  animation: 'spin 1s linear infinite',
};

const Loading = () => {
  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div {...stylex.props(styles.container)}>
        <div {...stylex.props(styles.spinner)} style={spinnerStyle} />
      </div>
    </>
  );
};

export default Loading;

