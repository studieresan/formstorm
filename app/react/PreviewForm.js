import {Form} from '/js/rendered-react/Form.js';

const { useState, useEffect } = React;

function TopInfo(props) {
  let prepost = props.formType.prepost === 0 ?
                'Pre' :
                'Post';

  return (
    <div>
      <h2 className='center'>{prepost} Event Form</h2>
      <h1 className='center'>{props.event.company_name}</h1>
      <p className='center'>{props.userData.real_name}</p>
    </div>
  );
}

function ErrorMessage(props) {     
  let warn = props.msg === '' ?
              '' :
              ' ⚠ ';
  
  return (
    <div>
      <p>
        <span className='warning-sign'>{warn}</span>
        <span className="warning-text">{props.msg}</span>
      </p>
    </div>
  );
}

export function FormWrapperPreview(props) {
  const [state, setState] = useState({
    formTypeId: null,
    answers: [],
    formType: {},
    userData: {},
    event: {},
    errMsg: ''
  });

  function handleFieldChange(index, value) {
    setState({
      ...state,
      answers: state.answers.replaceElem(index, value)
    });
  }

  function displayErr(s) {
    setState({
      ...state,
      errMsg: String(s)
    });
    window.scrollTo(0, 0);
  }

  function formReady(answers, formType) {
    setState({
      ...state,
      answers: answers,
      formType: formType
    });
  }

  let formName = 'name' in state.formType ?
                 state.formType.name :
                 '';

  return (
    <div>
      <a href='/info'><button>Back to home</button></a>
      <TopInfo formType={state.formType} userData={state.userData} event={state.event} />
      <h4 className='center'>Form name: {formName}</h4>
      <ErrorMessage msg={state.errMsg} />
      <Form answers={state.answers}
            handleFieldChange={handleFieldChange}
            formTypeId={props.form_type_id}
            formReady={formReady}
            displayErr={displayErr} />
    </div>
  );
}
