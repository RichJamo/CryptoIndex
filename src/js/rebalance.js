const DAPP_ADDRESS = "0x2D34147dAE678be2282EdB3A64C2eFd3909Fb080"; //insert the address I deployed to

const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

const WMATIC_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
const SUSHI_ADDRESS = "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a"
const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
const WBTC_ADDRESS = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"

const MATIC_USD_ORACLE = "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"
const SUSHI_USD_ORACLE = "0x49b0c695039243bbfeb8ecd054eb70061fd54aa0"
const ETH_USD_ORACLE = "0xF9680D99D6C9589e2a93a78A04A279e509205945"
const BTC_USD_ORACLE = "0xc907E116054Ad103354f2D350FD2514433D57F6f"

const QUICKSWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"

var user;

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const dappContract_signer = new ethers.Contract(DAPP_ADDRESS, sushi_index_abi, signer);

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

//check that we are connected to Polygon/Matic network
var chainId = await checkNetworkId(provider)
if (chainId !== 137) {
  console.log("Please change to Polygon network") //TODO make this an alert to the user...
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x89' }], //137 in 0x padded hexadecimal form is 0x89
    });
    window.location.reload();
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (error.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0x89', rpcUrl: 'https://rpc-mainnet.maticvigil.com/' /* ... */ }],
        });
      } catch (addError) {
        // handle "add" error
      }
    }
    // handle other "switch" errors
  }
}

if (provider) {
  startApp(provider); // Initialize your app
} else {
  console.log('Please install MetaMask!');
}

async function checkNetworkId(_provider) {
  try {
    var network = await provider.getNetwork();
    return network["chainId"];
  }
  catch (error) {
    console.log(error);
  }
}

async function startApp(provider) {
  //Basic Actions Section
  const rebalanceOneButton = document.getElementById('rebalance_1');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

  rebalanceOneButton.addEventListener('click', async () => {
    var array_coins = await getTokenInfoViaTokenContract();

    sortCoinsDescendingByDiffFromAvg(array_coins);
    //might this bit be partly easier to implement in solidity - it will wait better?
    await balanceAndRemoveOneCoin(array_coins);
  })
}

async function balanceAndRemoveOneCoin(array_coins) {
  var swapCounter = 0;
  var token_to_be_swapped_address = [];
  var token_swapping_to_address = [];
  var amount_to_be_swapped = [];

  do {
    var swapInputs = getSwapInputs(array_coins);
    token_to_be_swapped_address[swapCounter] = swapInputs[2][0];
    token_swapping_to_address[swapCounter] = swapInputs[2][1];
    amount_to_be_swapped[swapCounter] = swapInputs[0];

    updateArray(array_coins);
    swapCounter++;
  } while (array_coins.length > 1)

  await dappContract_signer.executeThreeSwaps(token_to_be_swapped_address[0], token_swapping_to_address[0], amount_to_be_swapped[0],
    token_to_be_swapped_address[1], token_swapping_to_address[1], amount_to_be_swapped[1],
    token_to_be_swapped_address[2], token_swapping_to_address[2], amount_to_be_swapped[2]);
}

function sortCoinsDescendingByDiffFromAvg(_array_coins) {
  _array_coins.sort((a, b) => {
    return b.diff_from_average - a.diff_from_average;
  });
}

async function checkIfApprovedForAmount(_token_address, _amount) {
  var approvedAmount = await getAllowance(_token_address, SUSHISWAP_ROUTER) //input token and router addresses
  if (approvedAmount.lt(_amount)) return false;
  else return true;
}

async function getAllowance(token_address, router_address) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // check what amount of user's tokens the spender is approved to use
  try {
    var approvedAmount = await tokenContract.allowance(DAPP_ADDRESS, router_address); //allowance(owner_address, spender_address)
    return approvedAmount;
  } catch (error) {
    console.log(error)
  }
}

function getSwapInputs(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average

    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address] //swap from first array item to last

    var amountIn = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)) //figure out how much to swap
    var amountOutMin = Math.abs(array_coins[array_coins.length - 1].diff_from_average) * (1 / (array_coins[array_coins.length - 1].usd_exchange_rate)) * 0.75;

    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    // $("#swapStarted").css("display", "block");
    // $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
  else {

    var swap_path = [array_coins[0].address, array_coins[array_coins.length - 1].address]; // swap from last array item to first

    var amountIn = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[0].usd_exchange_rate)); //figure out how much to swap
    var amountOutMin = Math.abs(array_coins[0].diff_from_average) * (1 / (array_coins[array_coins.length - 1].usd_exchange_rate)) * 0.75;
    var amountIn_Wei = parseInt(amountIn * 10 ** array_coins[0].decimals).toString() //am I introducing potential rounding errors here? And should I check for NaN after?
    var amountOutMin_Wei = parseInt(amountOutMin * 10 ** array_coins[array_coins.length - 1].decimals).toString()

    console.log(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);
    // $("#swapStarted").css("display", "block");
    // $("#swapStarted").text(`Swapping ${amountIn.toFixed(8)} of ${array_coins[0].symbol} for ${array_coins[array_coins.length - 1].symbol}`);

    return [amountIn_Wei, amountOutMin_Wei, swap_path];
  }
}

async function askUserForApproval(_token_address, _amount) {
  if (window.confirm("Time to get approval!")) {
    //ask for approval
    await giveApprovalFromDapp(_token_address, SUSHISWAP_ROUTER, _amount); //token_address, router_address, amountIn
  }
}

function updateArray(array_coins) {
  if (array_coins[0].diff_from_average > Math.abs(array_coins[array_coins.length - 1].diff_from_average)) { //check which coin is further from the dollar average
    decreaseFirstCoinDiffFromAverage(array_coins);
    removeFirstCoinAndReSort(array_coins);
  }
  else {
    decreaseLastCoinDiffFromAverage(array_coins)
    removeLastCoinAndReSort(array_coins);
  }
}

function decreaseFirstCoinDiffFromAverage(_array_coins) {
  _array_coins[0].diff_from_average -= Math.abs(_array_coins[_array_coins.length - 1].diff_from_average);
}

function decreaseLastCoinDiffFromAverage(_array_coins) {
  _array_coins[_array_coins.length - 1].diff_from_average += Math.abs(_array_coins[0].diff_from_average);
}

function removeFirstCoinAndReSort(_array_coins) {
  _array_coins.pop() //removes the last element from the array

  sortCoinsDescendingByDiffFromAvg(_array_coins);
}

function removeLastCoinAndReSort(_array_coins) {
  _array_coins.shift(); //remove the first element from the array

  sortCoinsDescendingByDiffFromAvg(_array_coins);
}

async function getBalance(token_address) {
  // create a new instance of a contract - in web3.js >1.0.0, will have to use "new web3.eth.Contract" (uppercase C)
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // get the balance of our user in that token
  try {
    var tokenBalance = await tokenContract.balanceOf(DAPP_ADDRESS);
    return tokenBalance; //I'm guessing this is a BN (or a string?)
  } catch (error) {
    console.log(error)
  }
}

async function getTokenInfoViaTokenContract() {

  function Coin(symbol, address, oracleAddress, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
    this.symbol = symbol;
    this.address = address;
    this.oracleAddress = oracleAddress;
    this.decimals = decimals;
    this.balance = balance;
    this.usd_balance = usd_balance;
    this.diff_from_average = diff_from_average;
    this.usd_exchange_rate = usd_exchange_rate;
  }

  //create a coin object for each of our 4 assets
  var WMATIC = new Coin("WMATIC", WMATIC_ADDRESS, MATIC_USD_ORACLE);
  var SUSHI = new Coin("SUSHI", SUSHI_ADDRESS, SUSHI_USD_ORACLE);
  var WBTC = new Coin("WBTC", WBTC_ADDRESS, BTC_USD_ORACLE);
  var WETH = new Coin("WETH", WETH_ADDRESS, ETH_USD_ORACLE);

  var array_coins = [WMATIC, SUSHI, WBTC, WETH];
  var total_in_usd = 0;

  for (let coin of array_coins) {
    coin.balance = await getBalance(coin.address);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat(ethers.utils.formatUnits(coin.balance, coin.decimals)) * coin.usd_exchange_rate;
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }
  return array_coins;
}

async function executeDappSwap(_amountIn, _amountOutMin, _path, _acct, _deadline) {
  console.log(`Swapping ${_amountIn} of ${_path[0]} into ${_path[1]}`);
  $("#swapStarted").css("display", "block");
  $("#swapStarted").text(`Swapping ${_amountIn} of ${_path[0]} into ${_path[1]}`);
  var estimatedGasLimit = await dappContract_signer.estimateGas.swap(_amountIn, _amountOutMin, _path, _acct, _deadline);
  try {
    await dappContract_signer.swap(_amountIn, _amountOutMin, _path, _acct, _deadline, { gasLimit: parseInt(estimatedGasLimit * 1.2) });
  }
  catch (error) {
    console.log(error); //can I get it to try again here??
  }
}

async function giveApprovalFromDapp(token_address, router_address, amountIn) {
  // give router_address approval to spend dapp's tokens
  try {
    var approved = await dappContract_signer.approve_spending(token_address, router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

// async function getExchangeRate(oracle_address) {
//   const provider_testnet = new ethers.getDefaultProvider("https://api.s0.b.hmny.io");
//   const aggregatorV3InterfaceABI = [{ "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "description", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint80", "name": "_roundId", "type": "uint80" }], "name": "getRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "latestRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "version", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
//   const addr = oracle_address;
//   const priceFeed = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider_testnet);

//   try {
//     var result = await priceFeed.latestRoundData();
//     console.log("Latest Round Data", result[1]);
//     return result[1]; //returns in BigNumber format
//   } catch (error) {
//     console.log(error);
//   }
// }

async function getExchangeRate(oracle_address) {
  var oracle = new ethers.Contract(oracle_address, CHAINLINK_ORACLE_ABI, provider);
  try {
    var exchangeRate = await oracle.latestAnswer();
    return exchangeRate; //returns in BigNumber format
  } catch (error) {
    console.log(error);
  }
}

async function getDecimals(token_address) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  // check how many decimals that token has
  try {
    var decimals = await tokenContract.decimals();//need to catch an error here - perhaps make this it's own function!
    return decimals;
  } catch (error) {
    console.log(error);
  }
}
