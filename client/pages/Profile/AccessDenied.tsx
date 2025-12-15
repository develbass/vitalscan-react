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
    padding: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a237e',
    marginBottom: '16px',
    textAlign: 'center',
  },
  message: {
    fontSize: '16px',
    color: '#3949ab',
    textAlign: 'center',
    lineHeight: '1.5',
  },
});

const AccessDenied = () => {
  return (
    <div {...stylex.props(styles.container)}>
      <h1 {...stylex.props(styles.title)}>Acesso Negado</h1>
      <p {...stylex.props(styles.message)}>
        O token não é válido. Verifique suas credenciais e tente novamente.
      </p>
    </div>
  );
};

export default AccessDenied;

