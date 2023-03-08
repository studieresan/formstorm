import {Form} from '/js/rendered-react/FormEdit.js';
import {getFetchErr} from '/js/rendered-react/common.js';

const { useState, useEffect } = React;

function TopInfo(props) {
  let prepost = props.formType.prepost === 0 ?
                'Pre' :
                'Post';

  return (
    <div>
      <h2 className='center'>{prepost} Event Form</h2>
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

export function FormWrapperEdit(props) {
  const [state, setState] = useState({
    formType: {},
    errMsg: ''
  });

  function submitNewForm(questions) {
    fetch("/api/form/submit-questions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        form_type_id: props.form_type_id,
        data: questions
      })
    }).then(getFetchErr('text'))
      .then((data) => {
        console.log("success:");
        console.log(data);
      })
      .catch((err) => {
        displayErr(err);
      });
  }

  function displayErr(s) {
    setState({
      ...state,
      errMsg: String(s)
    });
    window.scrollTo(0, 0);
  }

  function formReady(formType) {
    setState({
      ...state,
      formType: formType
    });
  }

  let formName = 'name' in state.formType ?
                 state.formType.name :
                 '';

  return (
    <div>
      <TopInfo formType={state.formType} />
      <h4 className='center'>Form name: {formName}</h4>
      <ErrorMessage msg={state.errMsg} />
      <Form questions={state.questions}
            submitNewForm={submitNewForm}
            formTypeId={props.form_type_id}
            formReady={formReady}
            displayErr={displayErr} />
    </div>
  );
}
